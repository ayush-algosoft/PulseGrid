import { z } from 'zod';

import { envelope } from './common.js';

/** A single price level: [price, size]. */
export const LevelSchema = z.tuple([z.number().positive(), z.number().nonnegative()]);
export type Level = z.infer<typeof LevelSchema>;

/**
 * Top-of-book depth snapshot. `bids` are sorted descending by price, `asks`
 * ascending. The gateway always sends full snapshots (no deltas) to keep the
 * client rendering path simple and jitter-free.
 */
export const OrderBookPayloadSchema = z.object({
  bids: z.array(LevelSchema),
  asks: z.array(LevelSchema),
  /** Imbalance in [-1, 1]: positive = bid-heavy, negative = ask-heavy. */
  imbalance: z.number().min(-1).max(1),
});
export type OrderBookPayload = z.infer<typeof OrderBookPayloadSchema>;

export const OrderBookEventSchema = envelope('orderbook', OrderBookPayloadSchema);
export type OrderBookEvent = z.infer<typeof OrderBookEventSchema>;
