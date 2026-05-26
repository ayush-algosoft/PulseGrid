# ADR 0003 — Normalized Zustand store with rAF-batched writes

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Hundreds of events per second arrive over one WebSocket. Calling `setState` per
message, or storing data in nested arrays, would re-render the whole tree and
miss the 60 fps budget.

## Decision

A single Zustand store holds **normalized** state — keyed maps by symbol
(`tickBySymbol`, `orderbookBySymbol`, `candlesByKey`, …) rather than nested
arrays. The WebSocket client buffers incoming messages and flushes them to the
store **once per animation frame** via `applyBatch`, which clones only the maps
it touches so unchanged symbols keep stable references. Components read narrow
selectors at the leaf, so a tick for AAPL never re-renders the MSFT row.

## Consequences

- Data is decoupled from paint; multiple ticks for a symbol within a frame
  collapse into one update.
- O(1) updates and selective re-rendering.
- Slightly more bookkeeping in `applyBatch` (the `ensure*` copy-on-write
  helpers), covered by a unit test asserting reference stability.
