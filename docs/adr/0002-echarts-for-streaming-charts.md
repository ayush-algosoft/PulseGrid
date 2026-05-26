# ADR 0002 — ECharts for streaming charts

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

The dashboard renders candlestick and line charts that update several times per
second. Re-rendering an SVG chart library (e.g. Recharts) on every update causes
visible jank at this cadence.

## Decision

Use **Apache ECharts** (via `echarts-for-react`). It renders to canvas, diffs
the option object instead of rebuilding the DOM, and supports incremental
updates — keeping high-frequency candle updates smooth. The component is loaded
with `next/dynamic({ ssr: false })` because ECharts touches the DOM.

## Consequences

- Smooth streaming updates with `animation: false` and option diffing.
- Canvas rendering means chart internals aren't in the DOM (acceptable; the
  surrounding stats and tape carry the accessible numbers).
- Charts are client-only; the server renders the surrounding shell.
