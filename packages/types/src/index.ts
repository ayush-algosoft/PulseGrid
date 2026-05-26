// Wire contracts are inferred from the Zod schemas — re-exported here so app
// code can depend on `@pulsegrid/types` without importing zod at the type level.
export type {
  Asset,
  AssetClass,
  Side,
  Scenario,
  MarketStatus,
  Timeframe,
  Topic,
  EventType,
  EnvelopeMeta,
} from '@pulsegrid/schemas';
export type { TickEvent, TickPayload } from '@pulsegrid/schemas';
export type { OrderBookEvent, OrderBookPayload, Level } from '@pulsegrid/schemas';
export type { TradeEvent, TradePayload } from '@pulsegrid/schemas';
export type { CandleEvent, CandlePayload, Candle, SymbolStats } from '@pulsegrid/schemas';
export type { NewsEvent, NewsPayload, Sentiment, Severity } from '@pulsegrid/schemas';
export type {
  MarketMetricsEvent,
  MarketMetricsPayload,
  Mover,
  Breadth,
} from '@pulsegrid/schemas';
export type {
  ChannelKind,
  ParsedChannel,
  ClientMessage,
  ControlMessage,
  ServerMessage,
  SnapshotMessage,
  EngineStatus,
} from '@pulsegrid/schemas';

/** A user's watchlist entry. Client-side only; never crosses the wire. */
export interface WatchlistItem {
  symbol: string;
  addedAt: number;
}

/** A named watchlist. */
export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

/** Persisted user preferences. */
export interface UserSettings {
  reducedMotion: boolean;
  density: 'comfortable' | 'compact';
  defaultSymbol: string;
  orderBookDepth: number;
  colorblindSafe: boolean;
  numberFormat: 'standard' | 'compact';
}

/** Connection lifecycle states surfaced in the UI. */
export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';
