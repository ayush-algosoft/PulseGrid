# ADR 0008 — A local shadcn-style UI kit and `/dev/components` gallery

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

The brief calls for shadcn/ui and a story-documented component inventory, and
allows a `/dev/components` route in place of a full Storybook (to be recorded).

## Decision

Reusable presentational primitives live in `@pulsegrid/ui` as typed,
prop-driven React components styled with Tailwind and the `cn()` helper — the
shadcn approach (composition + Tailwind + Radix-free primitives) without pulling
the generator and its CSS-variable theming, so the institutional token palette
is the single source of truth. Components are exercised in a live
**`/dev/components`** gallery rather than a separate Storybook.

## Consequences

- One token system (`packages/ui/tokens.ts`) drives Tailwind and ECharts theming.
- No Storybook build to maintain; the gallery renders the real components.
- If a richer primitive is needed later (e.g. a Radix popover), it can be added
  without reworking the theme.
