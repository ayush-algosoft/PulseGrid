import { z } from 'zod';

import { CandleSchema } from './candle.js';
import { AssetSchema, ScenarioSchema, type Timeframe } from './common.js';
import { MarketMetricsEventSchema } from './metrics.js';
import { NewsEventSchema } from './news.js';
import { OrderBookEventSchema } from './orderbook.js';
import { CandleEventSchema } from './candle.js';
import { TickEventSchema } from './tick.js';
import { TradeEventSchema } from './trade.js';

/**
 * Channel addressing. Clients subscribe to colon-delimited channel strings:
 *
 *   ticks:AAPL      ticks:*        book:AAPL       trades:AAPL    trades:*
 *   candles:AAPL:1m news:global    news:AAPL       metrics:global
 *
 * `*` is a wildcard meaning "all symbols" for the high-frequency channels.
 */
export const CHANNEL_KINDS = ['ticks', 'book', 'trades', 'candles', 'news', 'metrics'] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export interface ParsedChannel {
  kind: ChannelKind;
  symbol: string;
  tf?: Timeframe;
}

const CHANNEL_RE = /^(ticks|book|trades|candles|news|metrics):([A-Za-z0-9*]+)(?::(1s|5s|1m|5m|15m))?$/;

/** Parse and validate a channel string. Returns null when malformed. */
export function parseChannel(channel: string): ParsedChannel | null {
  const match = CHANNEL_RE.exec(channel);
  if (!match) return null;
  const [, kind, symbol, tf] = match;
  if (kind === 'candles' && !tf) return null;
  const parsed: ParsedChannel = { kind: kind as ChannelKind, symbol: symbol as string };
  if (tf) parsed.tf = tf as Timeframe;
  return parsed;
}

export const ChannelSchema = z.string().refine((c) => parseChannel(c) !== null, {
  message: 'invalid channel',
});

// ---- Client -> Server ----------------------------------------------------

export const SubscribeMessageSchema = z.object({
  action: z.literal('subscribe'),
  channels: z.array(ChannelSchema).min(1),
});

export const UnsubscribeMessageSchema = z.object({
  action: z.literal('unsubscribe'),
  channels: z.array(ChannelSchema).min(1),
});

export const PingMessageSchema = z.object({
  action: z.literal('ping'),
  ts: z.number().int().nonnegative(),
});

/**
 * Reconnect handshake. The client reports the last `seq` it saw per channel so
 * the gateway can decide between a gap-fill and a full snapshot resync.
 */
export const HelloMessageSchema = z.object({
  action: z.literal('hello'),
  resume: z.record(z.string(), z.number().int().nonnegative()).default({}),
});

/** Replay / scenario control commands. */
export const ControlMessageSchema = z.object({
  action: z.literal('control'),
  command: z.enum(['play', 'pause', 'setScenario', 'setSpeed', 'reseed']),
  scenario: ScenarioSchema.optional(),
  speed: z.number().positive().optional(),
  seed: z.number().int().optional(),
});
export type ControlMessage = z.infer<typeof ControlMessageSchema>;

export const ClientMessageSchema = z.discriminatedUnion('action', [
  SubscribeMessageSchema,
  UnsubscribeMessageSchema,
  PingMessageSchema,
  HelloMessageSchema,
  ControlMessageSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ---- Server -> Client ----------------------------------------------------

/** Engine/run status broadcast on connect and whenever control changes. */
export const EngineStatusSchema = z.object({
  type: z.literal('status'),
  running: z.boolean(),
  scenario: ScenarioSchema,
  speed: z.number().positive(),
  seed: z.number().int(),
  tickMs: z.number().positive(),
});
export type EngineStatus = z.infer<typeof EngineStatusSchema>;

/**
 * Initial snapshot delivered after subscribe and on reconnect resync. Carries
 * enough state to paint the whole dashboard instantly without waiting for the
 * stream to warm up.
 */
export const SnapshotMessageSchema = z.object({
  type: z.literal('snapshot'),
  /** True when this snapshot is a resync response to a reconnect hello. */
  resync: z.boolean(),
  assets: z.array(AssetSchema),
  ticks: z.array(TickEventSchema),
  metrics: MarketMetricsEventSchema,
  /** Candle history keyed by `symbol:tf`. */
  candles: z.record(z.string(), z.array(CandleSchema)),
  orderbooks: z.array(OrderBookEventSchema),
  trades: z.array(TradeEventSchema),
  news: z.array(NewsEventSchema),
  status: EngineStatusSchema,
});
export type SnapshotMessage = z.infer<typeof SnapshotMessageSchema>;

export const PongMessageSchema = z.object({
  type: z.literal('pong'),
  ts: z.number().int().nonnegative(),
});

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

/**
 * Any single server-to-client message. The gateway may also send a JSON array
 * of these as a coalesced batch frame; clients must handle both shapes.
 */
export const ServerMessageSchema = z.discriminatedUnion('type', [
  SnapshotMessageSchema,
  TickEventSchema,
  OrderBookEventSchema,
  TradeEventSchema,
  CandleEventSchema,
  MarketMetricsEventSchema,
  NewsEventSchema,
  EngineStatusSchema,
  PongMessageSchema,
  ErrorMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
