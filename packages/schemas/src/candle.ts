import { z } from 'zod';

import { envelope, TimeframeSchema } from './common.js';

/** OHLCV candle. `t` is the bucket-start epoch in ms. */
export const CandleSchema = z.object({
  t: z.number().int().nonnegative(),
  o: z.number().positive(),
  h: z.number().positive(),
  l: z.number().positive(),
  c: z.number().positive(),
  v: z.number().nonnegative(),
});
export type Candle = z.infer<typeof CandleSchema>;

/** Rolling per-symbol microstructure stats, emitted alongside candles. */
export const SymbolStatsSchema = z.object({
  vwap: z.number().positive(),
  /** Realised volatility over the rolling window, percent. */
  realizedVolPct: z.number().nonnegative(),
  /** Average spread over the rolling window, in basis points. */
  avgSpreadBps: z.number().nonnegative(),
  /** Relative strength index, 0-100. */
  rsi: z.number().min(0).max(100),
  /** Short-window momentum, percent. */
  momentumPct: z.number(),
});
export type SymbolStats = z.infer<typeof SymbolStatsSchema>;

/**
 * Candle event produced by the aggregator. Keyed in Kafka by `symbol:tf`.
 * `closed` is true on the bucket that just rolled over (final), false for the
 * forming candle — the UI renders the two distinctly.
 */
export const CandlePayloadSchema = z.object({
  tf: TimeframeSchema,
  candle: CandleSchema,
  closed: z.boolean(),
  stats: SymbolStatsSchema,
});
export type CandlePayload = z.infer<typeof CandlePayloadSchema>;

export const CandleEventSchema = envelope('candle', CandlePayloadSchema);
export type CandleEvent = z.infer<typeof CandleEventSchema>;
