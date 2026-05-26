# ADR 0005 — Reconnect resync from snapshot

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

The subscription protocol's reconnect contract allows the gateway to answer a
client's `hello` (with its last-seen `seq` per channel) with either a per-channel
gap-fill or a full snapshot resync. Gap-fill requires the gateway to retain a
replayable per-channel history buffer.

## Decision

On reconnect the client sends `{ action: "hello" }` and the gateway replies with
a **full snapshot** (`resync: true`) built from its in-memory `MarketState`
cache (latest ticks, order books, candle history, recent trades/news, global
metrics, engine status). The client treats the snapshot as fresh truth and
re-subscribes its active channels.

## Consequences

- Simple, robust recovery: the UI never loses its place or its watchlist, and no
  unbounded per-channel history buffer is needed.
- A reconnect transfers more bytes than a minimal gap-fill, but happens rarely
  and on localhost/LAN is negligible.
- `seq` is still carried on every event for gap **detection** and metering
  (the aggregator meters gaps); we simply chose snapshot resync as the
  **recovery** strategy.
