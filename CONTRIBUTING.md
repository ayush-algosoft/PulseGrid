# Contributing to PulseGrid

## Prerequisites

- Node.js ≥ 20 (`.nvmrc` pins 20)
- pnpm 9 (`corepack enable`)
- Docker (for the full stack)

## Getting started

```bash
pnpm install
pnpm dev          # gateway (standalone) + web, no Docker needed
# or
docker compose up --build   # full Kafka pipeline + observability
```

## Workflow & quality gates

Run these before pushing — CI runs the same:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @pulsegrid/web test:e2e   # needs the stack running
```

Hard rules (enforced by ESLint / tsconfig):

- TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- **No `any`** (use `unknown` + narrowing); no `@ts-ignore` without a reason.
- Validate every boundary (network, env, config) with Zod.
- No dead code, no commented-out blocks, no duplicated logic — extract to
  `utils`/`ui`.
- Respect the package dependency direction: `types ← schemas ← utils ←
  (ui, services)`; `web` may use them all; no app imports another app.

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
`chore:`, `docs:`, `test:`, `refactor:`, scoped where useful
(`feat(gateway): …`). Commit history should read as incremental work, not one
squash. `commitlint` + Husky + lint-staged run on commit.

## How to add a market scenario

1. Add the id to `ScenarioSchema` in `packages/schemas/src/common.ts`.
2. Add a `ScenarioConfig` entry in `packages/utils/src/scenarios.ts`
   (drift, vol, regime weights, jump/spread/trade params, correlation).
3. It automatically appears in the command palette and the Replay screen.
4. Add a determinism assertion in `packages/utils/src/engine.test.ts` if it has
   notable behavior.

## How to add an event type

1. Define the Zod payload + envelope in `packages/schemas/src` and export it.
2. Add the topic to `TOPICS` and document it in `docs/architecture`.
3. Produce it from a service and route it in the gateway (`channelsFor`).
4. Consume it in the web store's `applyBatch` and surface it via a selector hook.

## Repo layout

See [`docs/architecture`](docs/architecture/README.md) and
[`docs/adr`](docs/adr/README.md).
