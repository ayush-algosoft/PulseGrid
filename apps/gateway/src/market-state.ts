import {
  EVENT_VERSION,
  GLOBAL_SYMBOL,
  type Asset,
  type Candle,
  type CandleEvent,
  type EngineStatus,
  type MarketMetricsEvent,
  type NewsEvent,
  type OrderBookEvent,
  type Scenario,
  type SnapshotMessage,
  type SymbolStats,
  type TickEvent,
  type TradeEvent,
} from '@pulsegrid/schemas';

export type FeedEvent =
  | TickEvent
  | OrderBookEvent
  | TradeEvent
  | CandleEvent
  | MarketMetricsEvent
  | NewsEvent;

const MAX_TRADES = 80;
const MAX_NEWS = 50;
const MAX_CANDLES = 320;
const SNAPSHOT_CANDLES = 180;

/** A zeroed global-metrics event so a snapshot is always schema-valid. */
function emptyMetrics(scenario: Scenario): MarketMetricsEvent {
  return {
    v: EVENT_VERSION,
    id: '00000000-0000-4000-8000-000000000000',
    type: 'metrics',
    symbol: GLOBAL_SYMBOL,
    ts: 0,
    producedAt: 0,
    seq: 0,
    payload: {
      status: 'open',
      scenario,
      breadth: { advancers: 0, decliners: 0, unchanged: 0 },
      indexLevel: 1000,
      indexChangePct: 0,
      volatilityIndex: 0,
      totalVolume: 0,
      topByChange: [],
      topByVolume: [],
      topByVolatility: [],
    },
  };
}

/**
 * Single source of truth for the latest market picture, fed identically by the
 * standalone engine source and the Kafka source. Snapshots are derived from
 * here so the two transports are interchangeable.
 */
export class MarketState {
  private readonly ticks = new Map<string, TickEvent>();
  private readonly orderbooks = new Map<string, OrderBookEvent>();
  private readonly candles = new Map<string, Candle[]>();
  private readonly stats = new Map<string, SymbolStats>();
  private metrics: MarketMetricsEvent;
  private trades: TradeEvent[] = [];
  private news: NewsEvent[] = [];

  constructor(
    private readonly assets: readonly Asset[],
    private status: EngineStatus,
  ) {
    this.metrics = emptyMetrics(status.scenario);
  }

  setStatus(status: EngineStatus): void {
    this.status = status;
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  private upsertCandle(symbol: string, tf: string, candle: Candle): void {
    const key = `${symbol}:${tf}`;
    const list = this.candles.get(key) ?? [];
    const last = list[list.length - 1];
    if (last && last.t === candle.t) list[list.length - 1] = candle;
    else list.push(candle);
    if (list.length > MAX_CANDLES) list.splice(0, list.length - MAX_CANDLES);
    this.candles.set(key, list);
  }

  ingest(event: FeedEvent): void {
    switch (event.type) {
      case 'tick':
        this.ticks.set(event.symbol, event);
        break;
      case 'orderbook':
        this.orderbooks.set(event.symbol, event);
        break;
      case 'trade':
        this.trades.push(event);
        if (this.trades.length > MAX_TRADES) this.trades = this.trades.slice(-MAX_TRADES);
        break;
      case 'candle':
        this.upsertCandle(event.symbol, event.payload.tf, event.payload.candle);
        this.stats.set(event.symbol, event.payload.stats);
        break;
      case 'metrics':
        this.metrics = event;
        break;
      case 'news':
        this.news.push(event);
        if (this.news.length > MAX_NEWS) this.news = this.news.slice(-MAX_NEWS);
        break;
    }
  }

  getStats(symbol: string): SymbolStats | undefined {
    return this.stats.get(symbol);
  }

  snapshot(resync: boolean): SnapshotMessage {
    const candles: Record<string, Candle[]> = {};
    for (const [key, list] of this.candles) candles[key] = list.slice(-SNAPSHOT_CANDLES);
    return {
      type: 'snapshot',
      resync,
      assets: [...this.assets],
      ticks: [...this.ticks.values()],
      metrics: this.metrics,
      candles,
      orderbooks: [...this.orderbooks.values()],
      trades: [...this.trades],
      news: [...this.news],
      status: this.status,
    };
  }
}
