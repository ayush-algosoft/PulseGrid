import { z } from 'zod';

import { envelope } from './common.js';

export const SentimentSchema = z.enum(['bullish', 'bearish', 'neutral']);
export type Sentiment = z.infer<typeof SentimentSchema>;

export const SeveritySchema = z.enum(['info', 'notable', 'critical']);
export type Severity = z.infer<typeof SeveritySchema>;

/** A market-activity headline emitted alongside notable price action. */
export const NewsPayloadSchema = z.object({
  id: z.string(),
  headline: z.string().min(1),
  source: z.string().min(1),
  sentiment: SentimentSchema,
  severity: SeveritySchema,
  /** Sentiment magnitude in [0, 1] used for visual weighting. */
  score: z.number().min(0).max(1),
  tags: z.array(z.string()),
});
export type NewsPayload = z.infer<typeof NewsPayloadSchema>;

export const NewsEventSchema = envelope('news', NewsPayloadSchema);
export type NewsEvent = z.infer<typeof NewsEventSchema>;
