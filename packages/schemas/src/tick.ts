import { z } from 'zod';

import { envelope } from './common.js';

/** Best bid/offer + rolling session statistics for a single instrument. */
export const TickPayloadSchema = z.object({
  price: z.number().positive(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  mid: z.number().positive(),
  spread: z.number().nonnegative(),
  spreadBps: z.number().nonnegative(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  prevClose: z.number().positive(),
  change: z.number(),
  changePct: z.number(),
  volume: z.number().nonnegative(),
});
export type TickPayload = z.infer<typeof TickPayloadSchema>;

export const TickEventSchema = envelope('tick', TickPayloadSchema);
export type TickEvent = z.infer<typeof TickEventSchema>;
