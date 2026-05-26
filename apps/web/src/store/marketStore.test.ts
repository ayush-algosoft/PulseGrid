import { EVENT_VERSION, GLOBAL_SYMBOL } from '@pulsegrid/schemas';
import { type ServerMessage } from '@pulsegrid/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMarketStore } from './marketStore.js';

const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function tick(symbol: string, price: number, changePct: number): ServerMessage {
  return {
    v: EVENT_VERSION,
    id: uuid,
    type: 'tick',
    symbol,
    ts: 1000,
    producedAt: 1000,
    seq: 1,
    payload: {
      price,
      bid: price - 1,
      ask: price + 1,
      mid: price,
      spread: 2,
      spreadBps: 4,
      open: 100,
      high: price + 5,
      low: 95,
      prevClose: 100,
      change: price - 100,
      changePct,
      volume: 10,
    },
  };
}

const metrics: ServerMessage = {
  v: EVENT_VERSION,
  id: uuid,
  type: 'metrics',
  symbol: GLOBAL_SYMBOL,
  ts: 1000,
  producedAt: 1000,
  seq: 1,
  payload: {
    status: 'open',
    scenario: 'showcase',
    breadth: { advancers: 1, decliners: 0, unchanged: 0 },
    indexLevel: 1010,
    indexChangePct: 1,
    volatilityIndex: 12,
    totalVolume: 100,
    topByChange: [{ symbol: 'AAA', price: 110, changePct: 10, volume: 5, volatilityPct: 20 }],
    topByVolume: [],
    topByVolatility: [],
  },
};

describe('marketStore.applyBatch', () => {
  beforeEach(() => {
    useMarketStore.setState({ tickBySymbol: {}, metrics: null, trades: [] });
  });

  it('applies ticks and metrics in one batch', () => {
    useMarketStore.getState().applyBatch([tick('AAA', 110, 10), metrics]);
    const state = useMarketStore.getState();
    expect(state.tickBySymbol.AAA?.price).toBe(110);
    expect(state.metrics?.indexLevel).toBe(1010);
  });

  it('keeps unchanged symbol refs stable across batches (selective re-render)', () => {
    useMarketStore.getState().applyBatch([tick('AAA', 110, 10), tick('BBB', 50, -2)]);
    const before = useMarketStore.getState().tickBySymbol;
    useMarketStore.getState().applyBatch([tick('AAA', 111, 11)]);
    const after = useMarketStore.getState().tickBySymbol;
    expect(after.AAA).not.toBe(before.AAA); // changed symbol gets a new ref
    expect(after.BBB).toBe(before.BBB); // untouched symbol keeps its ref
  });
});
