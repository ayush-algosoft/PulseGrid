import { createLogger } from '@pulsegrid/utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { MarketState } from './market-state.js';
import { GatewayServer } from './server.js';
import { StandaloneSource } from './sources/standalone.js';

const PORT = 47_811;
const logger = createLogger('gateway-test');
logger.level = 'silent';

let source: StandaloneSource;
let server: GatewayServer;

beforeAll(async () => {
  source = new StandaloneSource(logger, { seed: 7, scenario: 'showcase', tickMs: 40 });
  const state = new MarketState(source.getAssets(), source.getStatus());
  source.warmup(state, 40);
  server = new GatewayServer(logger, state, source, PORT);
  server.start();
  await source.start();
});

afterAll(async () => {
  await source.stop();
  await server.stop();
});

function collect(channel: string, ms: number): Promise<{ messages: unknown[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/stream`);
    const messages: unknown[] = [];
    ws.on('open', () => ws.send(JSON.stringify({ action: 'subscribe', channels: [channel] })));
    ws.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString());
      if (Array.isArray(parsed)) messages.push(...parsed);
      else messages.push(parsed);
    });
    ws.on('error', reject);
    setTimeout(() => {
      ws.close();
      resolve({ messages });
    }, ms);
  });
}

describe('GatewayServer routing', () => {
  it('delivers a snapshot then only the subscribed symbol\'s ticks', async () => {
    const symbol = source.getAssets()[0]!.symbol;
    const other = source.getAssets()[1]!.symbol;
    const { messages } = await collect(`ticks:${symbol}`, 600);

    const snapshot = messages.find(
      (m): m is { type: string } =>
        typeof m === 'object' && m !== null && (m as { type?: string }).type === 'snapshot',
    );
    expect(snapshot).toBeDefined();

    const ticks = messages.filter(
      (m): m is { type: string; symbol: string } =>
        typeof m === 'object' && m !== null && (m as { type?: string }).type === 'tick',
    );
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((t) => t.symbol === symbol)).toBe(true);
    expect(ticks.some((t) => t.symbol === other)).toBe(false);
  }, 10_000);
});
