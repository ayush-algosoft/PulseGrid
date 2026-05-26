import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import {
  EVENT_VERSION,
  GLOBAL_SYMBOL,
  ScenarioSchema,
  TickEventSchema,
  TOPICS,
  TradeEventSchema,
  type CandleEvent,
  type MarketMetricsEvent,
} from '@pulsegrid/schemas';
import { createLogger, MarketDeriver } from '@pulsegrid/utils';
import { Kafka, type Producer } from 'kafkajs';
import { collectDefaultMetrics, Counter, Gauge, Registry } from 'prom-client';
import { z } from 'zod';

const ConfigSchema = z.object({
  brokers: z.string().default('localhost:19092'),
  metricsPort: z.coerce.number().int().positive().default(9102),
  scenario: ScenarioSchema.default('showcase'),
  metricsCadenceMs: z.coerce.number().int().positive().default(1000),
});

const config = ConfigSchema.parse({
  brokers: process.env.KAFKA_BROKERS,
  metricsPort: process.env.AGG_METRICS_PORT,
  scenario: process.env.SIM_SCENARIO,
  metricsCadenceMs: process.env.AGG_METRICS_CADENCE_MS,
});

const logger = createLogger('aggregator');

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'aggregator_' });
const consumed = new Counter({
  name: 'aggregator_events_consumed_total',
  help: 'Events consumed from Kafka',
  labelNames: ['topic'] as const,
  registers: [registry],
});
const candleCloses = new Counter({
  name: 'aggregator_candle_closes_total',
  help: 'Candles closed and published',
  labelNames: ['tf'] as const,
  registers: [registry],
});
const gapsDetected = new Counter({
  name: 'aggregator_seq_gaps_total',
  help: 'Per-symbol sequence gaps detected on the tick stream',
  registers: [registry],
});
const lastSeqGauge = new Gauge({
  name: 'aggregator_last_seq',
  help: 'Last processed tick sequence per symbol',
  labelNames: ['symbol'] as const,
  registers: [registry],
});

const deriver = new MarketDeriver();
const pendingVolume = new Map<string, number>();
const candleSeq = new Map<string, number>();
const lastTickSeq = new Map<string, number>();
let metricsSeq = 0;

const kafka = new Kafka({
  clientId: 'pulsegrid-aggregator',
  brokers: config.brokers.split(',').map((b) => b.trim()),
  retry: { retries: 30, initialRetryTime: 500 },
});

function publishCandles(producer: Producer, symbol: string, ts: number, result: ReturnType<MarketDeriver['ingestTick']>): Promise<unknown> {
  const messages = result.candleUpdates.map((u) => {
    const key = `${symbol}:${u.tf}`;
    const seq = (candleSeq.get(key) ?? 0) + 1;
    candleSeq.set(key, seq);
    if (u.closed) candleCloses.inc({ tf: u.tf });
    const event: CandleEvent = {
      v: EVENT_VERSION,
      id: randomUUID(),
      type: 'candle',
      symbol,
      ts,
      producedAt: Date.now(),
      seq,
      payload: { tf: u.tf, candle: u.candle, closed: u.closed, stats: result.stats },
    };
    return { key: `${symbol}:${u.tf}`, value: JSON.stringify(event) };
  });
  if (messages.length === 0) return Promise.resolve();
  return producer.send({ topic: TOPICS.candles, messages });
}

async function main(): Promise<void> {
  logger.info({ brokers: config.brokers }, 'starting aggregator');
  const consumer = kafka.consumer({ groupId: 'aggregator' });
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  await Promise.all([consumer.connect(), producer.connect()]);
  await consumer.subscribe({ topics: [TOPICS.ticks, TOPICS.trades], fromBeginning: false });
  logger.info('connected; consuming ticks + trades');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      let json: unknown;
      try {
        json = JSON.parse(message.value.toString());
      } catch {
        return;
      }

      if (topic === TOPICS.trades) {
        const trade = TradeEventSchema.safeParse(json);
        if (!trade.success) return;
        consumed.inc({ topic });
        pendingVolume.set(
          trade.data.symbol,
          (pendingVolume.get(trade.data.symbol) ?? 0) + trade.data.payload.size,
        );
        return;
      }

      if (topic === TOPICS.ticks) {
        const tick = TickEventSchema.safeParse(json);
        if (!tick.success) return;
        consumed.inc({ topic });
        const { symbol, seq, ts, payload } = tick.data;

        const prev = lastTickSeq.get(symbol);
        if (prev !== undefined && seq > prev + 1) gapsDetected.inc(seq - prev - 1);
        if (prev !== undefined && seq <= prev) return; // out-of-order / duplicate
        lastTickSeq.set(symbol, seq);
        lastSeqGauge.set({ symbol }, seq);

        const volumeDelta = pendingVolume.get(symbol) ?? 0;
        pendingVolume.set(symbol, 0);
        const result = deriver.ingestTick({
          symbol,
          ts,
          price: payload.price,
          open: payload.open,
          changePct: payload.changePct,
          volumeDelta,
          spreadBps: payload.spreadBps,
        });
        await publishCandles(producer, symbol, ts, result);
      }
    },
  });

  // Publish global market metrics on a fixed cadence.
  const metricsTimer = setInterval(() => {
    metricsSeq += 1;
    const event: MarketMetricsEvent = {
      v: EVENT_VERSION,
      id: randomUUID(),
      type: 'metrics',
      symbol: GLOBAL_SYMBOL,
      ts: Date.now(),
      producedAt: Date.now(),
      seq: metricsSeq,
      payload: deriver.globalMetrics('open', config.scenario),
    };
    producer
      .send({ topic: TOPICS.metrics, messages: [{ key: GLOBAL_SYMBOL, value: JSON.stringify(event) }] })
      .catch((err) => logger.error({ err }, 'metrics publish failed'));
  }, config.metricsCadenceMs);

  const metricsServer = createServer((req, res) => {
    if (req.url === '/metrics') {
      void registry.metrics().then((body) => {
        res.writeHead(200, { 'content-type': registry.contentType });
        res.end(body);
      });
      return;
    }
    res.writeHead(req.url === '/healthz' ? 200 : 404);
    res.end(req.url === '/healthz' ? 'ok' : '');
  });
  metricsServer.listen(config.metricsPort, () => {
    logger.info({ port: config.metricsPort }, 'metrics endpoint listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    clearInterval(metricsTimer);
    await consumer.disconnect();
    await producer.disconnect();
    metricsServer.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'aggregator failed');
  process.exit(1);
});
