# ADR 0004 — Gateway backpressure: latest-wins coalescing

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

A slow or backgrounded client must not let the gateway buffer unbounded frames.
But silently dropping trades or order-book updates would corrupt the client's
view without it knowing.

## Decision

Each connection has an outbound buffer flushed every ~25 ms (≈40 Hz, one render
frame). High-frequency channels are **coalesced latest-wins**: only the most
recent tick per symbol, book per symbol, forming candle per `symbol:tf`, and
global metrics are kept. **Trades, news, and closed candles are queued in order
and never dropped.** If `ws.bufferedAmount` exceeds a threshold, the coalescable
channels are shed for that cycle while the ordered stream is preserved. Dropped
(coalesced) counts are exported as a Prometheus metric.

## Consequences

- Bounded memory per client and frames aligned to paint.
- Ticks/book are always "latest truth"; the tape and activity feed stay complete.
- Reconnect uses a full snapshot resync (see ADR 0005) rather than per-channel
  gap-fill, which is the documented recovery path.
