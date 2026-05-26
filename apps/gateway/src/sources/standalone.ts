import { randomUUID } from 'node:crypto';

import {
  EVENT_VERSION,
  GLOBAL_SYMBOL,
  type Asset,
  type CandleEvent,
  type ControlMessage,
  type EngineStatus,
  type MarketMetricsEvent,
} from '@pulsegrid/schemas';
import { MarketDeriver, MarketEngine, type Logger } from '@pulsegrid/utils';

import { type FeedEvent, type MarketState } from '../market-state.js';

import { type MarketSource } from './source.js';

/**
 * Standalone source: runs the deterministic {@link MarketEngine} plus the
 * shared {@link MarketDeriver} in-process and emits the full event set (ticks,
 * book, trades, news, candles, global metrics). Requires no external
 * infrastructure, so it is the default for local development and demos.
 */
export class StandaloneSource implements MarketSource {
  private readonly engine: MarketEngine;
  private deriver = new MarketDeriver();
  private timer: ReturnType<typeof setInterval> | null = null;
  private eventsCb: ((events: FeedEvent[]) => void) | null = null;
  private statusCb: ((status: EngineStatus) => void) | null = null;
  private running = true;
  private speed = 1;
  private readonly baseTickMs: number;
  private readonly candleSeq = new Map<string, number>();
  private metricsSeq = 0;

  constructor(
    private readonly logger: Logger,
    opts: { seed: number; scenario: EngineStatus['scenario']; tickMs: number },
  ) {
    this.baseTickMs = opts.tickMs;
    this.engine = new MarketEngine({
      seed: opts.seed,
      scenario: opts.scenario,
      tickMs: opts.tickMs,
      startTime: Date.now(),
    });
  }

  /** Advance one tick and assemble every derived + raw event it yields. */
  private produce(): FeedEvent[] {
    const t = this.engine.step();
    const events: FeedEvent[] = [...t.ticks, ...t.orderbooks, ...t.trades, ...t.news];
    for (const tick of t.ticks) {
      const { candleUpdates, stats } = this.deriver.ingestTick({
        symbol: tick.symbol,
        ts: tick.ts,
        price: tick.payload.price,
        open: tick.payload.open,
        changePct: tick.payload.changePct,
        volumeDelta: t.volumeBySymbol[tick.symbol] ?? 0,
        spreadBps: tick.payload.spreadBps,
      });
      for (const update of candleUpdates) {
        const key = `${tick.symbol}:${update.tf}`;
        const seq = (this.candleSeq.get(key) ?? 0) + 1;
        this.candleSeq.set(key, seq);
        const candleEvent: CandleEvent = {
          v: EVENT_VERSION,
          id: randomUUID(),
          type: 'candle',
          symbol: tick.symbol,
          ts: tick.ts,
          producedAt: Date.now(),
          seq,
          payload: { tf: update.tf, candle: update.candle, closed: update.closed, stats },
        };
        events.push(candleEvent);
      }
    }
    this.metricsSeq += 1;
    const metricsEvent: MarketMetricsEvent = {
      v: EVENT_VERSION,
      id: randomUUID(),
      type: 'metrics',
      symbol: GLOBAL_SYMBOL,
      ts: t.ts,
      producedAt: Date.now(),
      seq: this.metricsSeq,
      payload: this.deriver.globalMetrics('open', this.engine.getScenario()),
    };
    events.push(metricsEvent);
    return events;
  }

  /** Warm up the simulation and pre-populate the gateway state cache. */
  warmup(state: MarketState, ticks: number): void {
    for (let i = 0; i < ticks; i += 1) {
      for (const event of this.produce()) state.ingest(event);
    }
    this.logger.info({ ticks }, 'standalone warmup complete');
  }

  async start(): Promise<void> {
    this.schedule();
    this.logger.info({ scenario: this.engine.getScenario() }, 'standalone source started');
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer);
    if (!this.running) return;
    const interval = Math.max(20, Math.round(this.baseTickMs / this.speed));
    this.timer = setInterval(() => {
      const events = this.produce();
      this.eventsCb?.(events);
    }, interval);
  }

  control(msg: ControlMessage): void {
    switch (msg.command) {
      case 'play':
        this.running = true;
        this.schedule();
        break;
      case 'pause':
        this.running = false;
        this.schedule();
        break;
      case 'setScenario':
        if (msg.scenario) {
          this.engine.setScenario(msg.scenario);
          this.deriver = new MarketDeriver();
        }
        break;
      case 'setSpeed':
        if (msg.speed) {
          this.speed = msg.speed;
          this.schedule();
        }
        break;
      case 'reseed':
        if (typeof msg.seed === 'number') {
          this.engine.reseed(msg.seed);
          this.deriver = new MarketDeriver();
        }
        break;
    }
    this.statusCb?.(this.getStatus());
  }

  onEvents(cb: (events: FeedEvent[]) => void): void {
    this.eventsCb = cb;
  }

  onStatus(cb: (status: EngineStatus) => void): void {
    this.statusCb = cb;
  }

  getAssets(): readonly Asset[] {
    return this.engine.getAssets();
  }

  getStatus(): EngineStatus {
    return {
      type: 'status',
      running: this.running,
      scenario: this.engine.getScenario(),
      speed: this.speed,
      seed: this.engine.getSeed(),
      tickMs: this.engine.getTickMs(),
    };
  }

  isLive(): boolean {
    return true;
  }

  isReady(): boolean {
    return true;
  }
}
