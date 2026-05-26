import { ServerMessageSchema, type ClientMessage, type ServerMessage } from '@pulsegrid/schemas';

import { GATEWAY_WS_URL } from '../config.js';
import { useMarketStore } from '../../store/marketStore.js';

const PING_INTERVAL_MS = 15_000;
const MAX_BACKOFF_MS = 15_000;

/**
 * The single WebSocket client for the whole app. It:
 *  - maintains one connection and reconnects with capped exponential backoff,
 *  - resyncs from a snapshot on reconnect (sends `hello`, re-subscribes),
 *  - refcounts channel subscriptions so panels can subscribe/unsubscribe freely,
 *  - decouples network from paint by buffering messages and flushing to the
 *    Zustand store once per animation frame (never setState per message).
 */
class MarketClient {
  private ws: WebSocket | null = null;
  private buffer: ServerMessage[] = [];
  private raf: number | null = null;
  private readonly channels = new Map<string, number>();
  private attempts = 0;
  private connectedBefore = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private latency = 0;
  private started = false;

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.open();
    this.loop();
  }

  private open(): void {
    useMarketStore.getState().setConnection(this.connectedBefore ? 'reconnecting' : 'connecting');
    const ws = new WebSocket(GATEWAY_WS_URL);
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      useMarketStore.getState().setConnection('open');
      if (this.connectedBefore) this.send({ action: 'hello', resume: {} });
      const active = [...this.channels.keys()];
      if (active.length) this.send({ action: 'subscribe', channels: active });
      this.connectedBefore = true;
      this.startPing();
    };
    ws.onmessage = (ev) => this.ingest(ev.data as string);
    ws.onclose = () => this.onDrop();
    ws.onerror = () => ws.close();
  }

  private onDrop(): void {
    this.stopPing();
    this.ws = null;
    useMarketStore.getState().setConnection('reconnecting');
    const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempts);
    this.attempts += 1;
    setTimeout(() => this.open(), delay);
  }

  private ingest(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const frames = Array.isArray(parsed) ? parsed : [parsed];
    for (const frame of frames) {
      const result = ServerMessageSchema.safeParse(frame);
      if (!result.success) continue;
      const msg = result.data;
      if (msg.type === 'pong') {
        this.latency = Date.now() - msg.ts;
        continue;
      }
      this.buffer.push(msg);
    }
  }

  /** rAF flush loop: collapse a frame's worth of messages into one store write. */
  private loop = (): void => {
    if (this.buffer.length > 0) {
      const batch = this.buffer;
      this.buffer = [];
      useMarketStore.getState().applyBatch(batch);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send({ action: 'ping', ts: Date.now() }), PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  subscribe(channels: string[]): void {
    const toSend: string[] = [];
    for (const channel of channels) {
      const count = this.channels.get(channel) ?? 0;
      if (count === 0) toSend.push(channel);
      this.channels.set(channel, count + 1);
    }
    if (toSend.length) this.send({ action: 'subscribe', channels: toSend });
  }

  unsubscribe(channels: string[]): void {
    const toRemove: string[] = [];
    for (const channel of channels) {
      const count = this.channels.get(channel) ?? 0;
      if (count <= 1) {
        this.channels.delete(channel);
        toRemove.push(channel);
      } else {
        this.channels.set(channel, count - 1);
      }
    }
    if (toRemove.length) this.send({ action: 'unsubscribe', channels: toRemove });
  }

  control(msg: Omit<Extract<ClientMessage, { action: 'control' }>, 'action'>): void {
    this.send({ action: 'control', ...msg });
  }

  reconnectNow(): void {
    if (this.ws) this.ws.close();
    else this.open();
  }

  getLatency(): number {
    return this.latency;
  }

  dispose(): void {
    this.stopPing();
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.ws?.close();
    this.started = false;
  }
}

let instance: MarketClient | null = null;

export function getMarketClient(): MarketClient {
  if (!instance) instance = new MarketClient();
  return instance;
}
