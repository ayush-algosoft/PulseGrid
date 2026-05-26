import { createServer } from 'node:http';

import { ScenarioSchema, TOPICS } from '@pulsegrid/schemas';
import { createLogger, MarketEngine } from '@pulsegrid/utils';
import { Kafka, type Producer } from 'kafkajs';
import { collectDefaultMetrics, Counter, Registry } from 'prom-client';
import { z } from 'zod';

const ConfigSchema = z.object({
  brokers: z.string().default('localhost:19092'),
  seed: z.coerce.number().int().default(42),
  scenario: ScenarioSchema.default('showcase'),
  tickMs: z.coerce.number().int().positive().default(250),
  metricsPort: z.coerce.number().int().positive().default(9103),
});

const config = ConfigSchema.parse({
  brokers: process.env.KAFKA_BROKERS,
  seed: process.env.SIM_SEED,
  scenario: process.env.SIM_SCENARIO,
  tickMs: process.env.SIM_TICK_MS,
  metricsPort: process.env.SIM_METRICS_PORT,
});

const logger = createLogger('simulator');

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'simulator_' });
const produced = new Counter({
  name: 'simulator_events_produced_total',
  help: 'Total events produced to Kafka',
  labelNames: ['topic'] as const,
  registers: [registry],
});

const kafka = new Kafka({
  clientId: 'pulsegrid-simulator',
  brokers: config.brokers.split(',').map((b) => b.trim()),
  retry: { retries: 30, initialRetryTime: 500 },
});

const engine = new MarketEngine({
  seed: config.seed,
  scenario: config.scenario,
  tickMs: config.tickMs,
  startTime: Date.now(),
});

async function produceTick(producer: Producer): Promise<void> {
  const t = engine.step();
  const batches = [
    { topic: TOPICS.ticks, events: t.ticks },
    { topic: TOPICS.orderbook, events: t.orderbooks },
    { topic: TOPICS.trades, events: t.trades },
    { topic: TOPICS.news, events: t.news },
  ];
  await Promise.all(
    batches
      .filter((b) => b.events.length > 0)
      .map((b) => {
        produced.inc({ topic: b.topic }, b.events.length);
        return producer.send({
          topic: b.topic,
          messages: b.events.map((e) => ({ key: e.symbol, value: JSON.stringify(e) })),
        });
      }),
  );
}

async function main(): Promise<void> {
  logger.info(
    { brokers: config.brokers, scenario: config.scenario, seed: config.seed },
    'starting simulator',
  );
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  logger.info('connected to kafka');

  const timer = setInterval(() => {
    produceTick(producer).catch((err) => logger.error({ err }, 'produce failed'));
  }, config.tickMs);

  const control = createServer((req, res) => {
    if (req.url === '/metrics') {
      void registry.metrics().then((body) => {
        res.writeHead(200, { 'content-type': registry.contentType });
        res.end(body);
      });
      return;
    }
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/control') {
      const scenario = url.searchParams.get('scenario');
      const seed = url.searchParams.get('seed');
      const parsed = scenario ? ScenarioSchema.safeParse(scenario) : null;
      if (parsed?.success) engine.setScenario(parsed.data);
      if (seed) engine.reseed(Number(seed));
      logger.info({ scenario, seed }, 'control applied');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  control.listen(config.metricsPort, () => {
    logger.info({ port: config.metricsPort }, 'control + metrics endpoint listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    clearInterval(timer);
    await producer.disconnect();
    control.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'simulator failed');
  process.exit(1);
});
