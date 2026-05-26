import { randomUUID } from 'node:crypto';

import { type EngineStatus } from '@pulsegrid/schemas';
import { EVENT_VERSION, GLOBAL_SYMBOL } from '@pulsegrid/schemas';
import { MarketDeriver, MarketEngine } from '@pulsegrid/utils';
import { describe, expect, it } from 'vitest';

import { MarketState, type FeedEvent } from './market-state.js';

const status: EngineStatus = {
  type: 'status',
  running: true,
  scenario: 'showcase',
  speed: 1,
  seed: 1,
  tickMs: 250,
};

/** Run the engine + deriver and feed the full event set into a MarketState. */
function feed(state: MarketState, ticks: number): void {
  const engine = new MarketEngine({ seed: 1, scenario: 'showcase', startTime: 1_000 });
  const deriver = new MarketDeriver();
  for (let i = 0; i < ticks; i += 1) {
    const t = engine.step();
    const events: FeedEvent[] = [...t.ticks, ...t.orderbooks, ...t.trades, ...t.news];
    for (const tick of t.ticks) {
      const { candleUpdates, stats } = deriver.ingestTick({
        symbol: tick.symbol,
        ts: tick.ts,
        price: tick.payload.price,
        open: tick.payload.open,
        changePct: tick.payload.changePct,
        volumeDelta: t.volumeBySymbol[tick.symbol] ?? 0,
        spreadBps: tick.payload.spreadBps,
      });
      for (const u of candleUpdates) {
        events.push({
          v: EVENT_VERSION,
          id: randomUUID(),
          type: 'candle',
          symbol: tick.symbol,
          ts: tick.ts,
          producedAt: Date.now(),
          seq: i + 1,
          payload: { tf: u.tf, candle: u.candle, closed: u.closed, stats },
        });
      }
    }
    events.push({
      v: EVENT_VERSION,
      id: randomUUID(),
      type: 'metrics',
      symbol: GLOBAL_SYMBOL,
      ts: t.ts,
      producedAt: Date.now(),
      seq: i + 1,
      payload: deriver.globalMetrics('open', 'showcase'),
    });
    for (const e of events) state.ingest(e);
  }
}

describe('MarketState', () => {
  it('produces a fully populated snapshot from the event set', () => {
    const engine = new MarketEngine({ seed: 1 });
    const state = new MarketState(engine.getAssets(), status);
    feed(state, 60);
    const snapshot = state.snapshot(false);
    expect(snapshot.ticks.length).toBe(engine.getAssets().length);
    expect(snapshot.orderbooks.length).toBe(engine.getAssets().length);
    expect(snapshot.metrics.payload.topByChange.length).toBeGreaterThan(0);
    expect(Object.keys(snapshot.candles).length).toBeGreaterThan(0);
    expect(snapshot.resync).toBe(false);
  });

  it('caps the trade tape and marks resync snapshots', () => {
    const engine = new MarketEngine({ seed: 2 });
    const state = new MarketState(engine.getAssets(), status);
    feed(state, 200);
    const snapshot = state.snapshot(true);
    expect(snapshot.resync).toBe(true);
    expect(snapshot.trades.length).toBeLessThanOrEqual(80);
  });
});
