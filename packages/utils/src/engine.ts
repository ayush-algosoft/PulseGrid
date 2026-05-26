import {
  EVENT_VERSION,
  type Asset,
  type EventType,
  type NewsEvent,
  type OrderBookEvent,
  type Scenario,
  type Severity,
  type Side,
  type TickEvent,
  type TradeEvent,
} from '@pulsegrid/schemas';

import { ASSETS } from './assets.js';
import { clampValue, quantize } from './decimal.js';
import {
  initialRegime,
  REGIME_EFFECT,
  stepRegime,
  type Regime,
  type RegimeState,
} from './regime.js';
import { OrderBookSim } from './orderbook-sim.js';
import { SCENARIOS, SHOWCASE_REGIME_BY_INDEX } from './scenarios.js';
import { SeededRng } from './rng.js';

/** A fixed simulated market epoch; pinning it makes runs byte-reproducible. */
export const DEFAULT_START_TIME = 1_700_000_000_000;

export interface EngineOptions {
  seed?: number;
  scenario?: Scenario;
  tickMs?: number;
  assets?: readonly Asset[];
  depth?: number;
  /** Simulated market-clock start (epoch ms). Pin for deterministic replay. */
  startTime?: number;
}

/** Everything produced by a single engine tick (raw market events only). */
export interface EngineTick {
  ts: number;
  ticks: TickEvent[];
  orderbooks: OrderBookEvent[];
  trades: TradeEvent[];
  news: NewsEvent[];
  /** Per-symbol traded volume this tick, for downstream candle/stat derivation. */
  volumeBySymbol: Record<string, number>;
}

interface SymbolState {
  asset: Asset;
  index: number;
  price: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  seq: number;
  volMult: number;
  regime: RegimeState;
  book: OrderBookSim;
}

const NEWS_TEMPLATES: Record<'bullish' | 'bearish' | 'neutral', readonly string[]> = {
  bullish: [
    'breaks key resistance on heavy volume',
    'rallies as buyers step in across the curve',
    'sees aggressive bid-side accumulation',
    'momentum funds rotate in',
  ],
  bearish: [
    'slides as liquidity thins out',
    'hit by cascading stop-loss orders',
    'sellers dominate the tape',
    'breaks support amid risk-off flows',
  ],
  neutral: [
    'consolidates in a tight range',
    'two-way flow keeps price anchored',
    'volatility compresses ahead of data',
    'order book stays balanced',
  ],
};

const NEWS_SOURCES = ['PulseWire', 'Tape Reader', 'Desk Note', 'Flow Monitor'] as const;

/**
 * Deterministic market simulation engine.
 *
 * Price evolves as geometric Brownian motion modulated by a per-symbol regime
 * state machine and a shared market factor (correlation), with scenario-driven
 * drift, jumps and mean reversion. A persistent order book is consumed by
 * Poisson-arriving trades whose aggressor side tracks short-term momentum.
 *
 * Given a fixed (seed, scenario, startTime) the market-data output is
 * byte-identical on every run — the foundation for replay and tests. Only
 * `producedAt` (wall clock) varies between runs.
 */
export class MarketEngine {
  private rng: SeededRng;
  private readonly states = new Map<string, SymbolState>();
  private readonly assets: readonly Asset[];
  private readonly depth: number;
  private readonly startTime: number;
  private scenario: Scenario;
  private seed: number;
  private tickMs: number;
  private elapsedTicks = 0;
  private tradeCounter = 0;

  constructor(opts: EngineOptions = {}) {
    this.seed = opts.seed ?? 42;
    this.scenario = opts.scenario ?? 'showcase';
    this.tickMs = opts.tickMs ?? 250;
    this.assets = opts.assets ?? ASSETS;
    this.depth = opts.depth ?? 14;
    this.startTime = opts.startTime ?? DEFAULT_START_TIME;
    this.rng = new SeededRng(this.seed);
    this.initStates();
  }

  private initStates(): void {
    this.states.clear();
    const cfg = SCENARIOS[this.scenario];
    this.assets.forEach((asset, index) => {
      const baseSize = asset.basePrice > 500 ? 6 : 300;
      const regime: RegimeState =
        this.scenario === 'showcase'
          ? {
              regime: SHOWCASE_REGIME_BY_INDEX[index % SHOWCASE_REGIME_BY_INDEX.length] as Regime,
              ticksLeft: Number.MAX_SAFE_INTEGER,
            }
          : initialRegime(this.rng, cfg.regimeWeights, cfg.regimeMinTicks, cfg.regimeMaxTicks);
      this.states.set(asset.symbol, {
        asset,
        index,
        price: asset.basePrice,
        open: asset.basePrice,
        high: asset.basePrice,
        low: asset.basePrice,
        prevClose: asset.basePrice,
        volume: 0,
        seq: 0,
        volMult: 1,
        regime,
        book: new OrderBookSim(this.depth, baseSize),
      });
    });
  }

  getAssets(): readonly Asset[] {
    return this.assets;
  }

  getScenario(): Scenario {
    return this.scenario;
  }

  getSeed(): number {
    return this.seed;
  }

  getTickMs(): number {
    return this.tickMs;
  }

  setScenario(scenario: Scenario): void {
    this.scenario = scenario;
    this.initStates();
    this.elapsedTicks = 0;
  }

  reseed(seed: number): void {
    this.seed = seed;
    this.rng = new SeededRng(seed);
    this.initStates();
    this.elapsedTicks = 0;
  }

  private makeEnvelope<T extends EventType>(
    type: T,
    symbol: string,
    seq: number,
    ts: number,
  ): { v: typeof EVENT_VERSION; id: string; type: T; symbol: string; ts: number; producedAt: number; seq: number } {
    return {
      v: EVENT_VERSION,
      id: this.rng.uuid(),
      type,
      symbol,
      ts,
      producedAt: Date.now(),
      seq,
    };
  }

  /** Advance the simulation by one tick and return the raw events produced. */
  step(): EngineTick {
    const cfg = SCENARIOS[this.scenario];
    this.elapsedTicks += 1;
    const ts = this.startTime + this.elapsedTicks * this.tickMs;

    const ticks: TickEvent[] = [];
    const orderbooks: OrderBookEvent[] = [];
    const trades: TradeEvent[] = [];
    const news: NewsEvent[] = [];
    const volumeBySymbol: Record<string, number> = {};

    // Shared market factor drives correlation across all instruments this tick.
    const commonFactor = this.rng.normal(0, 1);
    const rho = clampValue(cfg.correlation, 0, 0.95);
    const wCommon = Math.sqrt(rho);
    const wIdio = Math.sqrt(1 - rho);

    const baseDrift =
      cfg.recoveryAfterTicks !== undefined &&
      cfg.recoveryDrift !== undefined &&
      this.elapsedTicks > cfg.recoveryAfterTicks
        ? cfg.recoveryDrift
        : cfg.drift;

    for (const s of this.states.values()) {
      s.seq += 1;
      if (this.scenario !== 'showcase') {
        s.regime = stepRegime(
          s.regime,
          this.rng,
          cfg.regimeWeights,
          cfg.regimeMinTicks,
          cfg.regimeMaxTicks,
        );
      }
      const effect = REGIME_EFFECT[s.regime.regime];
      s.volMult = clampValue(s.volMult * cfg.volDecay, 0.4, 4);

      const vol = cfg.vol * effect.volMult * s.volMult;
      const drift = baseDrift + effect.driftAdd;
      const meanRev = cfg.meanReversion * effect.meanRevMult;
      const reversion = meanRev * Math.log(s.asset.basePrice / s.price);
      const z = wCommon * commonFactor + wIdio * this.rng.normal(0, 1);
      let logReturn = drift + reversion + vol * z;
      if (this.rng.bool(cfg.jumpProb)) {
        const dir = this.rng.normal(cfg.jumpBias, 1);
        logReturn += Math.sign(dir) * Math.abs(this.rng.normal(0, cfg.jumpScale));
      }
      const fairMid = quantize(
        clampValue(s.price * Math.exp(logReturn), s.asset.tickSize, s.asset.basePrice * 1000),
        s.asset.tickSize,
      );

      const spreadBps = cfg.spreadBps * effect.spreadMult * s.volMult;
      const halfSpread = Math.max(s.asset.tickSize / 2, (fairMid * spreadBps) / 10_000 / 2);

      // --- book replenishes, then trades consume it ---
      s.book.refresh(this.rng);
      const nTrades = Math.max(
        0,
        Math.round(this.rng.normal(cfg.tradeIntensity * effect.tradeMult, 1.5)),
      );
      const momentumSign = Math.sign(logReturn) || 1;
      const buyBias = clampValue(0.5 + momentumSign * 0.18, 0.2, 0.8);
      let tickVolume = 0;
      let lastTradePrice = fairMid;
      for (let i = 0; i < nTrades; i += 1) {
        const side: Side = this.rng.bool(buyBias) ? 'buy' : 'sell';
        const isBlock = this.rng.bool(cfg.blockProb);
        const unit =
          s.asset.basePrice > 500 ? this.rng.range(0.05, 2.2) : this.rng.range(20, 420);
        const size = Number((isBlock ? unit * this.rng.range(8, 26) : unit).toFixed(4));
        const tradePrice = quantize(
          fairMid * (1 + (side === 'buy' ? 1 : -1) * this.rng.range(0, 0.0005)),
          s.asset.tickSize,
        );
        s.book.consume(side, size);
        tickVolume += size;
        lastTradePrice = tradePrice;
        this.tradeCounter += 1;
        trades.push({
          ...this.makeEnvelope('trade', s.asset.symbol, s.seq, ts),
          payload: {
            id: `t-${this.tradeCounter}`,
            price: tradePrice,
            size,
            side,
            notional: Number((tradePrice * size).toFixed(2)),
            isBlock,
          },
        });
      }

      // --- settle price from the book / last trade ---
      const snap = s.book.snapshot(fairMid, halfSpread, s.asset.tickSize);
      const bid = snap.bids[0]?.[0] ?? quantize(fairMid - halfSpread, s.asset.tickSize);
      const ask = snap.asks[0]?.[0] ?? quantize(fairMid + halfSpread, s.asset.tickSize);
      const mid = (bid + ask) / 2;
      s.price = nTrades > 0 ? lastTradePrice : mid;
      s.high = Math.max(s.high, s.price);
      s.low = Math.min(s.low, s.price);
      s.volume += tickVolume;
      volumeBySymbol[s.asset.symbol] = tickVolume;

      const change = s.price - s.prevClose;
      const changePct = (change / s.prevClose) * 100;

      ticks.push({
        ...this.makeEnvelope('tick', s.asset.symbol, s.seq, ts),
        payload: {
          price: s.price,
          bid: Math.max(bid, s.asset.tickSize),
          ask,
          mid,
          spread: ask - bid,
          spreadBps: ((ask - bid) / mid) * 10_000,
          open: s.open,
          high: s.high,
          low: s.low,
          prevClose: s.prevClose,
          change,
          changePct,
          volume: s.volume,
        },
      });

      orderbooks.push({
        ...this.makeEnvelope('orderbook', s.asset.symbol, s.seq, ts),
        payload: { bids: snap.bids, asks: snap.asks, imbalance: snap.imbalance },
      });

      const newsEvent = this.maybeNews(s, ts, changePct);
      if (newsEvent) news.push(newsEvent);
    }

    return { ts, ticks, orderbooks, trades, news, volumeBySymbol };
  }

  private maybeNews(s: SymbolState, ts: number, changePct: number): NewsEvent | null {
    const cfg = SCENARIOS[this.scenario];
    const intensity = cfg.newsProb * (1 + Math.min(Math.abs(changePct) / 2, 3));
    if (!this.rng.bool(intensity)) return null;
    const sentiment = changePct > 0.4 ? 'bullish' : changePct < -0.4 ? 'bearish' : 'neutral';
    const absMove = Math.abs(changePct);
    const severity: Severity = absMove > 2.5 ? 'critical' : absMove > 1 ? 'notable' : 'info';
    return {
      ...this.makeEnvelope('news', s.asset.symbol, s.seq, ts),
      payload: {
        id: `news-${s.seq}-${s.asset.symbol}`,
        headline: `${s.asset.name} ${this.rng.pick(NEWS_TEMPLATES[sentiment])}`,
        source: this.rng.pick(NEWS_SOURCES),
        sentiment,
        severity,
        score: clampValue(absMove / 3, 0.1, 1),
        tags: [s.asset.assetClass, this.scenario],
      },
    };
  }
}
