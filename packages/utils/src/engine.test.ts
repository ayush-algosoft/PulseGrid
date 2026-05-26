import { describe, expect, it } from 'vitest';

import { CandleAggregator } from './candle-aggregator.js';
import { eq, quantize } from './decimal.js';
import { MarketDeriver } from './deriver.js';
import { MarketEngine } from './engine.js';
import { buildMarketMetrics } from './market-metrics.js';
import { SeededRng } from './rng.js';
import { SymbolStatsTracker } from './symbol-stats.js';

describe('SeededRng', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = new SeededRng(123);
    const b = new SeededRng(123);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('produces deterministic, well-formed uuids', () => {
    const a = new SeededRng(7);
    const b = new SeededRng(7);
    const id = a.uuid();
    expect(id).toEqual(b.uuid());
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('weighted pick honours zero weights', () => {
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i += 1) {
      expect(rng.weighted(['a', 'b'], [1, 0])).toBe('a');
    }
  });
});

describe('decimal utils', () => {
  it('quantises to a tick size without representation dust', () => {
    expect(quantize(1.08507, 0.0001)).toBe(1.0851);
    expect(quantize(42_000.3, 0.5)).toBe(42_000.5);
  });

  it('compares floats with an epsilon, never ===', () => {
    expect(eq(0.1 + 0.2, 0.3)).toBe(true);
    expect(0.1 + 0.2 === 0.3).toBe(false);
  });
});

describe('MarketEngine', () => {
  it('is byte-deterministic across runs for the same seed/scenario/startTime', () => {
    const run = () => {
      const engine = new MarketEngine({ seed: 999, scenario: 'bull-run', startTime: 1_000 });
      const out: string[] = [];
      for (let i = 0; i < 25; i += 1) {
        const t = engine.step();
        for (const tick of t.ticks) out.push(`${tick.id}:${tick.payload.price}:${tick.seq}`);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('emits a tick and an order book per asset each step', () => {
    const engine = new MarketEngine({ seed: 1 });
    const { ticks, orderbooks } = engine.step();
    expect(ticks).toHaveLength(engine.getAssets().length);
    expect(orderbooks).toHaveLength(engine.getAssets().length);
  });

  it('keeps prices positive and book ordered under flash-crash', () => {
    const engine = new MarketEngine({ seed: 5, scenario: 'flash-crash' });
    for (let i = 0; i < 300; i += 1) {
      for (const tick of engine.step().ticks) {
        expect(tick.payload.price).toBeGreaterThan(0);
        expect(tick.payload.ask).toBeGreaterThanOrEqual(tick.payload.bid);
      }
    }
  });

  it('showcase pins distinct regimes so movers diverge in both directions', () => {
    const engine = new MarketEngine({ seed: 42, scenario: 'showcase', startTime: 1_000 });
    let last = engine.step();
    for (let i = 0; i < 400; i += 1) last = engine.step();
    const changes = last.ticks.map((t) => t.payload.changePct);
    expect(Math.max(...changes)).toBeGreaterThan(0);
    expect(Math.min(...changes)).toBeLessThan(0);
  });
});

describe('CandleAggregator', () => {
  it('rolls buckets and flags closed candles', () => {
    const agg = new CandleAggregator();
    const first = agg.update(0, 100, 5);
    expect(first.some((u) => u.tf === '1s' && !u.closed)).toBe(true);
    const rolled = agg.update(1_500, 102, 3); // crosses the 1s boundary
    expect(rolled.some((u) => u.tf === '1s' && u.closed)).toBe(true);
    expect(agg.candles('1s').length).toBeGreaterThan(0);
  });
});

describe('SymbolStatsTracker', () => {
  it('reports VWAP within the traded range and bounded RSI', () => {
    const t = new SymbolStatsTracker();
    t.update(100, 10, 2);
    t.update(102, 5, 2);
    t.update(101, 8, 2);
    const s = t.stats();
    expect(s.vwap).toBeGreaterThan(99);
    expect(s.vwap).toBeLessThan(103);
    expect(s.rsi).toBeGreaterThanOrEqual(0);
    expect(s.rsi).toBeLessThanOrEqual(100);
  });
});

describe('buildMarketMetrics', () => {
  it('computes breadth and ranks top movers', () => {
    const metrics = buildMarketMetrics(
      [
        { symbol: 'A', price: 110, open: 100, changePct: 10, volume: 5, volatilityPct: 20 },
        { symbol: 'B', price: 95, open: 100, changePct: -5, volume: 9, volatilityPct: 40 },
        { symbol: 'C', price: 100, open: 100, changePct: 0, volume: 1, volatilityPct: 5 },
      ],
      'open',
      'showcase',
    );
    expect(metrics.breadth).toEqual({ advancers: 1, decliners: 1, unchanged: 1 });
    expect(metrics.topByChange[0]?.symbol).toBe('A');
    expect(metrics.topByVolume[0]?.symbol).toBe('B');
    expect(metrics.topByVolatility[0]?.symbol).toBe('B');
  });
});

describe('MarketDeriver', () => {
  it('derives candles + stats and global metrics from engine output', () => {
    const engine = new MarketEngine({ seed: 3, scenario: 'showcase', startTime: 1_000 });
    const deriver = new MarketDeriver();
    for (let i = 0; i < 80; i += 1) {
      const t = engine.step();
      for (const tick of t.ticks) {
        deriver.ingestTick({
          symbol: tick.symbol,
          ts: tick.ts,
          price: tick.payload.price,
          open: tick.payload.open,
          changePct: tick.payload.changePct,
          volumeDelta: t.volumeBySymbol[tick.symbol] ?? 0,
          spreadBps: tick.payload.spreadBps,
        });
      }
    }
    const metrics = deriver.globalMetrics('open', 'showcase');
    expect(metrics.topByChange.length).toBeGreaterThan(0);
    expect(deriver.candles('BTCUSD', '1s').length).toBeGreaterThan(0);
  });
});
