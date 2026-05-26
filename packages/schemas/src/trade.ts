import { z } from 'zod';

import { envelope, SideSchema } from './common.js';

/** A single executed trade print on the tape. */
export const TradePayloadSchema = z.object({
  id: z.string(),
  price: z.number().positive(),
  size: z.number().positive(),
  /** Aggressor side: which side crossed the spread. */
  side: SideSchema,
  /** Notional value = price * size, precomputed for the tape UI. */
  notional: z.number().nonnegative(),
  /** Flags unusually large prints so the UI can highlight whale activity. */
  isBlock: z.boolean(),
});
export type TradePayload = z.infer<typeof TradePayloadSchema>;

export const TradeEventSchema = envelope('trade', TradePayloadSchema);
export type TradeEvent = z.infer<typeof TradeEventSchema>;
