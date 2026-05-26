import { createServer, type Server } from 'node:http';

import {
  ClientMessageSchema,
  type EngineStatus,
  type ServerMessage,
} from '@pulsegrid/schemas';
import { type Logger } from '@pulsegrid/utils';
import { WebSocketServer, type WebSocket } from 'ws';

import { type FeedEvent, type MarketState } from './market-state.js';
import {
  activeConnections,
  eventsIngested,
  framesDropped,
  framesSent,
  messagesSent,
} from './metrics.js';
import { type MarketSource } from './sources/source.js';

const FLUSH_MS = 25; // ~40Hz: aligns outbound frames to roughly one render frame
const HEARTBEAT_MS = 30_000;
const MAX_BUFFERED_BYTES = 1_000_000; // backpressure threshold per connection

/** The channel strings an event should be routed to. */
function channelsFor(event: FeedEvent): string[] {
  switch (event.type) {
    case 'tick':
      return [`ticks:${event.symbol}`, 'ticks:*'];
    case 'orderbook':
      return [`book:${event.symbol}`];
    case 'trade':
      return [`trades:${event.symbol}`, 'trades:*'];
    case 'candle':
      return [`candles:${event.symbol}:${event.payload.tf}`];
    case 'metrics':
      return ['metrics:global'];
    case 'news':
      return [`news:${event.symbol}`, 'news:global'];
  }
}

/**
 * Per-connection outbound buffer with latest-wins coalescing. High-frequency
 * channels (ticks, book, forming candles, metrics) keep only the most recent
 * value per key; trades, news and closed candles are queued in order and never
 * dropped. Buffers flush together on a short interval as one batched frame.
 */
class Client {
  readonly channels = new Set<string>();
  alive = true;
  snapshotSent = false;

  private latestTick = new Map<string, ServerMessage>();
  private latestBook = new Map<string, ServerMessage>();
  private latestCandle = new Map<string, ServerMessage>(); // forming candles only
  private latestMetrics: ServerMessage | null = null;
  private ordered: ServerMessage[] = [];

  constructor(
    readonly ws: WebSocket,
    readonly id: string,
  ) {}

  enqueue(event: FeedEvent): void {
    switch (event.type) {
      case 'tick':
        this.coalesce(this.latestTick, event.symbol, event, 'ticks');
        break;
      case 'orderbook':
        this.coalesce(this.latestBook, event.symbol, event, 'book');
        break;
      case 'metrics':
        if (this.latestMetrics) framesDropped.inc({ channel: 'metrics' });
        this.latestMetrics = event;
        break;
      case 'candle':
        if (event.payload.closed) {
          this.ordered.push(event); // final candles are never dropped
        } else {
          this.coalesce(this.latestCandle, `${event.symbol}:${event.payload.tf}`, event, 'candles');
        }
        break;
      case 'trade':
      case 'news':
        this.ordered.push(event); // tape + activity feed are never dropped
        break;
    }
  }

  private coalesce(
    map: Map<string, ServerMessage>,
    key: string,
    event: ServerMessage,
    channel: string,
  ): void {
    if (map.has(key)) framesDropped.inc({ channel });
    map.set(key, event);
  }

  /** Send a message immediately, bypassing the batch (snapshot, status, pong). */
  sendNow(message: ServerMessage): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(message));
    framesSent.inc();
    messagesSent.inc();
  }

  flush(): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    const backpressured = this.ws.bufferedAmount > MAX_BUFFERED_BYTES;
    const batch: ServerMessage[] = [];
    if (!backpressured) {
      // Under backpressure we shed the coalescable channels this cycle and keep
      // only the ordered (trades/news/closed-candle) stream intact.
      batch.push(...this.latestTick.values());
      batch.push(...this.latestBook.values());
      batch.push(...this.latestCandle.values());
      if (this.latestMetrics) batch.push(this.latestMetrics);
    }
    batch.push(...this.ordered);
    this.reset(backpressured);
    if (batch.length === 0) return;
    this.ws.send(JSON.stringify(batch));
    framesSent.inc();
    messagesSent.inc(batch.length);
  }

  private reset(keepCoalescable: boolean): void {
    if (!keepCoalescable) {
      this.latestTick.clear();
      this.latestBook.clear();
      this.latestCandle.clear();
      this.latestMetrics = null;
    }
    this.ordered = [];
  }
}

/** WebSocket gateway: routes market events to subscribed clients efficiently. */
export class GatewayServer {
  private readonly http: Server;
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<Client>();
  /** Subscription index: channel string -> interested clients. */
  private readonly index = new Map<string, Set<Client>>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private flusher: ReturnType<typeof setInterval> | null = null;
  private clientSeq = 0;

  constructor(
    private readonly logger: Logger,
    private readonly state: MarketState,
    private readonly source: MarketSource,
    private readonly port: number,
  ) {
    this.http = createServer((req, res) => this.handleHttp(req, res));
    this.wss = new WebSocketServer({ server: this.http, path: '/stream' });
  }

  private handleHttp(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse): void {
    if (req.url === '/healthz') {
      res.writeHead(this.source.isLive() ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: this.source.isLive() ? 'ok' : 'down' }));
      return;
    }
    if (req.url === '/readyz') {
      const ready = this.source.isReady();
      res.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ready, clients: this.clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  }

  start(): void {
    this.source.onEvents((events) => this.onEvents(events));
    this.source.onStatus((status) => this.onStatus(status));
    this.wss.on('connection', (ws) => this.onConnection(ws));
    this.heartbeat = setInterval(() => this.checkHeartbeats(), HEARTBEAT_MS);
    this.flusher = setInterval(() => {
      for (const client of this.clients) client.flush();
    }, FLUSH_MS);
    this.http.listen(this.port, () => {
      this.logger.info({ port: this.port, path: '/stream' }, 'websocket gateway listening');
    });
  }

  private onConnection(ws: WebSocket): void {
    this.clientSeq += 1;
    const client = new Client(ws, `c${this.clientSeq}`);
    this.clients.add(client);
    activeConnections.set(this.clients.size);
    this.logger.debug({ client: client.id, total: this.clients.size }, 'client connected');

    ws.on('message', (raw) => this.onMessage(client, raw.toString()));
    ws.on('pong', () => {
      client.alive = true;
    });
    ws.on('close', () => this.removeClient(client));
    ws.on('error', () => this.removeClient(client));

    client.sendNow(this.source.getStatus());
  }

  private subscribe(client: Client, channels: string[]): void {
    for (const channel of channels) {
      client.channels.add(channel);
      let set = this.index.get(channel);
      if (!set) {
        set = new Set();
        this.index.set(channel, set);
      }
      set.add(client);
    }
  }

  private unsubscribe(client: Client, channels: string[]): void {
    for (const channel of channels) {
      client.channels.delete(channel);
      this.index.get(channel)?.delete(client);
    }
  }

  private onMessage(client: Client, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      client.sendNow({ type: 'error', message: 'invalid JSON' });
      return;
    }
    const result = ClientMessageSchema.safeParse(parsed);
    if (!result.success) {
      client.sendNow({ type: 'error', message: 'invalid message' });
      return;
    }
    const msg = result.data;
    switch (msg.action) {
      case 'subscribe':
        this.subscribe(client, msg.channels);
        if (!client.snapshotSent) {
          client.sendNow(this.state.snapshot(false));
          client.snapshotSent = true;
        }
        break;
      case 'unsubscribe':
        this.unsubscribe(client, msg.channels);
        break;
      case 'hello':
        // Reconnect: we resync from a fresh snapshot (see ADR-0005).
        client.sendNow(this.state.snapshot(true));
        client.snapshotSent = true;
        break;
      case 'ping':
        client.sendNow({ type: 'pong', ts: msg.ts });
        break;
      case 'control':
        this.source.control(msg);
        break;
    }
  }

  private onEvents(events: FeedEvent[]): void {
    for (const event of events) {
      this.state.ingest(event);
      eventsIngested.inc({ type: event.type });
      const seen = new Set<Client>();
      for (const channel of channelsFor(event)) {
        const set = this.index.get(channel);
        if (!set) continue;
        for (const client of set) {
          if (seen.has(client)) continue;
          seen.add(client);
          client.enqueue(event);
        }
      }
    }
  }

  private onStatus(status: EngineStatus): void {
    this.state.setStatus(status);
    for (const client of this.clients) client.sendNow(status);
  }

  private checkHeartbeats(): void {
    for (const client of this.clients) {
      if (!client.alive) {
        client.ws.terminate();
        this.removeClient(client);
        continue;
      }
      client.alive = false;
      if (client.ws.readyState === client.ws.OPEN) client.ws.ping();
    }
  }

  private removeClient(client: Client): void {
    if (!this.clients.has(client)) return;
    this.clients.delete(client);
    for (const channel of client.channels) this.index.get(channel)?.delete(client);
    activeConnections.set(this.clients.size);
    this.logger.debug({ client: client.id, total: this.clients.size }, 'client disconnected');
  }

  async stop(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.flusher) clearInterval(this.flusher);
    for (const client of this.clients) client.ws.close();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }
}
