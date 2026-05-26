# ADR 0007 — Deterministic UUIDs for byte-reproducible replay

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

The event envelope carries a UUID `id` for idempotency. The simulator must also
be byte-deterministic given a `(seed, scenario, startTime)` so scenarios replay
identically and determinism can be asserted in tests. `crypto.randomUUID()`
would break that determinism.

## Decision

The engine derives event ids from its **seeded RNG** (`SeededRng.uuid()`), which
emits RFC-4122 v4-formatted strings from the deterministic stream. Market-clock
`ts` is also derived deterministically (`startTime + elapsedTicks * tickMs`).
Only `producedAt` (wall clock) varies between runs and is explicitly excluded
from the determinism guarantee.

## Consequences

- Same `(seed, scenario, startTime)` ⇒ byte-identical market-data stream,
  asserted by a unit test on ids + prices + seq.
- Ids remain valid UUIDs for idempotency/dedup.
- Derived events produced outside the engine (candles/metrics in the aggregator
  and standalone source) use `crypto.randomUUID()`; their *payloads* are still
  deterministic because they are computed from deterministic inputs.
