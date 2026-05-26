import { z } from 'zod';

import { envelope, MarketStatusSchema, ScenarioSchema } from './common.js';

/** A single entry in a top-movers leaderboard. */
export const MoverSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  changePct: z.number(),
  volume: z.number().nonnegative(),
  volatilityPct: z.number().nonnegative(),
});
export type Mover = z.infer<typeof MoverSchema>;

export const BreadthSchema = z.object({
  advancers: z.number().int().nonnegative(),
  decliners: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
});
export type Breadth = z.infer<typeof BreadthSchema>;

/**
 * Global, market-wide metrics produced by the aggregator on a fixed cadence.
 * Published to `market.metrics` with the reserved symbol "global".
 */
export const MarketMetricsPayloadSchema = z.object({
  status: MarketStatusSchema,
  scenario: ScenarioSchema,
  breadth: BreadthSchema,
  /** Equal-weighted index level across tracked symbols (base 1000). */
  indexLevel: z.number().positive(),
  indexChangePct: z.number(),
  /** Aggregate annualised volatility index. */
  volatilityIndex: z.number().nonnegative(),
  totalVolume: z.number().nonnegative(),
  topByChange: z.array(MoverSchema),
  topByVolume: z.array(MoverSchema),
  topByVolatility: z.array(MoverSchema),
});
export type MarketMetricsPayload = z.infer<typeof MarketMetricsPayloadSchema>;

export const MarketMetricsEventSchema = envelope('metrics', MarketMetricsPayloadSchema);
export type MarketMetricsEvent = z.infer<typeof MarketMetricsEventSchema>;

/** Reserved symbol used for global (non-per-instrument) events. */
export const GLOBAL_SYMBOL = 'global';
