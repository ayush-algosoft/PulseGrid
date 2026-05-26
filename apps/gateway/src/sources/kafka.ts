import {
  CandleEventSchema,
  MarketMetricsEventSchema,
  NewsEventSchema,
  OrderBookEventSchema,
  TickEventSchema,
  TOPICS,
  TradeEventSchema,
  type Asset,
  type ControlMessage,
  type EngineStatus,
} from '@pulsegrid/schemas';
import { ASSETS, type Logger } from '@pulsegrid/utils';
import { Kafka, type Consumer } from 'kafkajs';

import { type FeedEvent } from '../market-state.js';
import { kafkaConnected } from '../metrics.js';

import { type MarketSource } from './source.js';

const PARSERS = {
  [TOPICS.ticks]: TickEventSchema,
  [TOPICS.orderbook]: OrderBookEventSchema,
  [TOPICS.trades]: TradeEventSchema,
  [TOPICS.candles]: CandleEventSchema,
  [TOPICS.metrics]: MarketMetricsEventSchema,
  [TOPICS.news]: NewsEventSchema,
} as const;

/**
 * Kafka source: consumes every market topic from Redpanda and forwards
 * validated events. Used in the full docker-compose deployment where the
 * simulator and aggregator run as independent services.
 */
export class KafkaSource implements MarketSource {
  private readonly kafka: Kafka;
  private readonly brokers: string[];
  private consumer: Consumer | null = null;
  private eventsCb: ((events: FeedEvent[]) => void) | null = null;
  private connected = false;
  private status: EngineStatus;

  constructor(
    private readonly logger: Logger,
    opts: { brokers: string; scenario: EngineStatus['scenario']; tickMs: number; seed: number },
  ) {
    this.brokers = opts.brokers.split(',').map((b) => b.trim());
    this.kafka = new Kafka({
      clientId: 'pulsegrid-gateway',
      brokers: this.brokers,
      retry: { retries: 20, initialRetryTime: 500 },
    });
    this.status = {
      type: 'status',
      running: true,
      scenario: opts.scenario,
      speed: 1,
      seed: opts.seed,
      tickMs: opts.tickMs,
    };
  }

  async start(): Promise<void> {
    const consumer = this.kafka.consumer({ groupId: `gateway-${process.pid}` });
    await consumer.connect();
    await consumer.subscribe({ topics: Object.values(TOPICS), fromBeginning: false });
    this.consumer = consumer;
    this.connected = true;
    kafkaConnected.set(1);
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        const parser = PARSERS[topic as keyof typeof PARSERS];
        if (!parser) return;
        let json: unknown;
        try {
          json = JSON.parse(message.value.toString());
        } catch {
          return;
        }
        const result = parser.safeParse(json);
        if (!result.success) {
          this.logger.warn({ topic }, 'dropped malformed event');
          return;
        }
        this.eventsCb?.([result.data as FeedEvent]);
      },
    });
    this.logger.info({ brokers: this.brokers }, 'kafka source consuming');
  }

  async stop(): Promise<void> {
    this.connected = false;
    kafkaConnected.set(0);
    await this.consumer?.disconnect();
    this.consumer = null;
  }

  control(msg: ControlMessage): void {
    // Replay/scenario control is owned by the simulator service in Kafka mode.
    this.logger.info(
      { command: msg.command },
      'control ignored (managed by simulator in kafka mode)',
    );
  }

  onEvents(cb: (events: FeedEvent[]) => void): void {
    this.eventsCb = cb;
  }

  onStatus(): void {
    // Status is static in kafka mode; nothing to subscribe to.
  }

  getAssets(): readonly Asset[] {
    return ASSETS;
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  isLive(): boolean {
    return true;
  }

  isReady(): boolean {
    return this.connected;
  }
}
