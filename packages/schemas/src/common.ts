import { z } from 'zod';

/**
 * Global event schema version. Every event published to Kafka or pushed over
 * the WebSocket gateway carries this version so consumers can evolve safely.
 * Bump on a breaking change and write an ADR + migration note.
 */
export const EVENT_VERSION = 1 as const;

/** Kafka topics. Keep in sync with infra topic creation (see infra/redpanda). */
export const TOPICS = {
  ticks: 'market.ticks',
  orderbook: 'market.orderbook',
  trades: 'market.trades',
  candles: 'market.candles',
  metrics: 'market.metrics',
  news: 'market.news',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

/** Event type discriminator carried in the envelope. */
export const EventTypeSchema = z.enum([
  'tick',
  'orderbook',
  'trade',
  'candle',
  'metrics',
  'news',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const SideSchema = z.enum(['buy', 'sell']);
export type Side = z.infer<typeof SideSchema>;

export const AssetClassSchema = z.enum(['crypto', 'equity', 'fx', 'commodity']);
export type AssetClass = z.infer<typeof AssetClassSchema>;

export const MarketStatusSchema = z.enum(['open', 'closed', 'pre', 'post']);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

/** Candle timeframes the aggregator produces. */
export const TimeframeSchema = z.enum(['1s', '5s', '1m', '5m', '15m']);
export type Timeframe = z.infer<typeof TimeframeSchema>;

export const TIMEFRAMES: readonly Timeframe[] = ['1s', '5s', '1m', '5m', '15m'];

/** Duration of each timeframe bucket in milliseconds. */
export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1s': 1_000,
  '5s': 5_000,
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
};

export const ScenarioSchema = z.enum([
  'showcase',
  'bull-run',
  'flash-crash',
  'sideways',
  'whale-activity',
  'market-open-frenzy',
]);
export type Scenario = z.infer<typeof ScenarioSchema>;

/** Default scenario: the curated cold-open state that lights up every pane. */
export const DEFAULT_SCENARIO: Scenario = 'showcase';

/** Human-friendly metadata for a tradeable instrument. */
export const AssetSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetClass: AssetClassSchema,
  quoteCurrency: z.string(),
  /** Minimum price increment; prices snap to a multiple of this. */
  tickSize: z.number().positive(),
  basePrice: z.number().positive(),
});
export type Asset = z.infer<typeof AssetSchema>;

/**
 * The versioned event envelope. Every cross-service message uses this shape:
 * a typed payload wrapped with identity, ordering and timing metadata.
 *
 * - `id`        — unique event id for idempotency (deterministic under replay).
 * - `ts`        — market-clock time (epoch ms) the event represents.
 * - `producedAt`— wall-clock time the producer emitted it (epoch ms).
 * - `seq`       — monotonic per (symbol, type) sequence for gap detection.
 */
export function envelope<TType extends EventType, TPayload extends z.ZodTypeAny>(
  type: TType,
  payload: TPayload,
) {
  return z.object({
    v: z.literal(EVENT_VERSION),
    id: z.string().uuid(),
    type: z.literal(type),
    symbol: z.string(),
    ts: z.number().int().nonnegative(),
    producedAt: z.number().int().nonnegative(),
    seq: z.number().int().nonnegative(),
    payload,
  });
}

/** Fields shared by every envelope, useful for generic helpers. */
export interface EnvelopeMeta {
  v: typeof EVENT_VERSION;
  id: string;
  type: EventType;
  symbol: string;
  ts: number;
  producedAt: number;
  seq: number;
}
