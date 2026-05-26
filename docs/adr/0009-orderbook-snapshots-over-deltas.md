# ADR 0009 — Order book transported as top-N snapshots

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

The `market.orderbook` topic is described as carrying depth deltas. A delta
protocol requires every consumer (and the client) to maintain and reconcile a
book, with resync logic when a delta is missed.

## Decision

The simulator maintains a real, persistent two-sided book (resting size that
replenishes toward a depth-shaped target and is **consumed by aggressing
trades**), but publishes a **top-N snapshot** of it each tick rather than
deltas. The gateway forwards the latest snapshot (latest-wins). This keeps the
client render path trivial and jitter-free.

## Consequences

- No client-side book reconstruction or delta-gap handling; the ladder simply
  renders the newest snapshot.
- Slightly more bytes per book update than minimal deltas, mitigated by
  latest-wins coalescing at the gateway.
- The microstructure realism (liquidity consumption moving the book) is
  preserved in the simulator; only the wire representation is a snapshot.
