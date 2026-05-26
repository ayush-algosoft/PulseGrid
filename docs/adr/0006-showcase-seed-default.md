# ADR 0006 — Curated `showcase` scenario as the default

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

A visitor opening the app for the first time must see every pane populated with
believable, moving data — not an empty or uniformly flat board. A single
random-walk scenario does not guarantee a trend, a range, and a volatile name on
screen simultaneously.

## Decision

Ship a `showcase` scenario that is the **default** when none is selected. It pins
specific symbols to specific regimes (`SHOWCASE_REGIME_BY_INDEX`) so a cold open
always shows at least one trending-up, one trending-down, one range-bound, and
one volatile instrument — producing top movers in both directions, a lively
tape with block prints, a two-sided book, seeded news, and live breadth/index.
The gateway also warms the engine ~320 ticks before the first client connects so
the opening snapshot is already rich.

## Consequences

- "Open it cold, touch nothing, every pane tells a story" holds by construction.
- The five spec scenarios (`bull-run`, `flash-crash`, `sideways`,
  `whale-activity`, `market-open-frenzy`) remain available as deterministic demo
  presets on the Replay screen.
- `showcase` is an additional scenario beyond the five; it is the only one that
  pins regimes per symbol.
