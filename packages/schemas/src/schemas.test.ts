import { describe, expect, it } from 'vitest';

import { EVENT_VERSION } from './common.js';
import { TickEventSchema } from './tick.js';
import { ClientMessageSchema, parseChannel, ServerMessageSchema } from './ws.js';

function tickEvent() {
  return {
    v: EVENT_VERSION,
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    type: 'tick' as const,
    symbol: 'BTCUSD',
    ts: 1_700_000_000_000,
    producedAt: 1_700_000_000_010,
    seq: 1,
    payload: {
      price: 42_000,
      bid: 41_999,
      ask: 42_001,
      mid: 42_000,
      spread: 2,
      spreadBps: 0.48,
      open: 41_000,
      high: 42_500,
      low: 40_800,
      prevClose: 41_200,
      change: 800,
      changePct: 1.94,
      volume: 1234.5,
    },
  };
}

describe('event envelope', () => {
  it('accepts a well-formed tick event', () => {
    expect(TickEventSchema.parse(tickEvent())).toMatchObject({ symbol: 'BTCUSD', type: 'tick' });
  });

  it('requires a uuid id', () => {
    expect(TickEventSchema.safeParse({ ...tickEvent(), id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects an event with the wrong version', () => {
    expect(TickEventSchema.safeParse({ ...tickEvent(), v: 99 }).success).toBe(false);
  });
});

describe('channel parsing', () => {
  it('parses per-symbol and wildcard channels', () => {
    expect(parseChannel('ticks:AAPL')).toEqual({ kind: 'ticks', symbol: 'AAPL' });
    expect(parseChannel('ticks:*')).toEqual({ kind: 'ticks', symbol: '*' });
    expect(parseChannel('candles:BTCUSD:1m')).toEqual({
      kind: 'candles',
      symbol: 'BTCUSD',
      tf: '1m',
    });
    expect(parseChannel('metrics:global')).toEqual({ kind: 'metrics', symbol: 'global' });
  });

  it('rejects malformed channels and candles without a timeframe', () => {
    expect(parseChannel('candles:BTCUSD')).toBeNull();
    expect(parseChannel('bogus:AAPL')).toBeNull();
    expect(parseChannel('ticks:AA PL')).toBeNull();
  });
});

describe('websocket protocol', () => {
  it('parses a subscribe message', () => {
    const parsed = ClientMessageSchema.parse({
      action: 'subscribe',
      channels: ['ticks:AAPL', 'metrics:global'],
    });
    expect(parsed.action).toBe('subscribe');
  });

  it('defaults the reconnect resume map to empty', () => {
    const parsed = ClientMessageSchema.parse({ action: 'hello' });
    expect(parsed).toMatchObject({ action: 'hello', resume: {} });
  });

  it('parses a pong server message', () => {
    expect(ServerMessageSchema.parse({ type: 'pong', ts: 1 }).type).toBe('pong');
  });

  it('rejects an unknown client action', () => {
    expect(ClientMessageSchema.safeParse({ action: 'nope' }).success).toBe(false);
  });
});
