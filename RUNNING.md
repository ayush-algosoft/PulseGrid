# Running PulseGrid from scratch

This is a step-by-step guide to bringing PulseGrid up on a fresh machine
(macOS, Linux, or Windows). There are two paths:

- **Path A — Docker (recommended, one command).** Runs the full event pipeline:
  Redpanda + simulator + aggregator + gateway + web + Prometheus + Grafana.
- **Path B — Local with pnpm (no Docker).** Runs the gateway in standalone mode
  (the market engine runs in-process) plus the web app. Fastest for iteration.

You only need one path. Path A is the canonical, must-work entry point.

---

## 0. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Git | any recent | cloning |
| Docker Desktop / Engine + Compose v2 | 24+ | Path A |
| Node.js | ≥ 20 | Path B |
| pnpm | 9 (via Corepack) | Path B |

Check what you have:

```bash
git --version
docker --version && docker compose version   # Path A
node --version                                # Path B (need v20+)
```

> Windows: run the commands in **PowerShell** or **Git Bash**. Make sure Docker
> Desktop is **running** before Path A.

---

## 1. Get the code

```bash
git clone https://github.com/ayush-algosoft/PulseGrid.git
cd PulseGrid
```

No `.env` editing is required — sensible defaults are baked in. `.env.example`
documents the overrides if you want them.

---

## Path A — Docker (one command)

### A1. Bring up the whole stack

```bash
docker compose up --build
```

The first build downloads images and installs dependencies, so it takes a few
minutes. Subsequent runs are fast. When it settles you'll see the services
logging steadily (the simulator producing events, the aggregator consuming).

Leave that terminal running, or start it detached instead:

```bash
docker compose up --build -d
```

### A2. Open the apps

| URL | What |
|---|---|
| http://localhost:3000 | **PulseGrid terminal** |
| http://localhost:3001 | Grafana → dashboard *PulseGrid · Pipeline Health* (anonymous admin) |
| http://localhost:9090 | Prometheus |

Open http://localhost:3000 and **touch nothing** — the board, chart, order book,
trade tape, top movers, news and watchlist are all already populated and moving.

### A3. (Optional) Verify the pipeline from the shell

```bash
curl http://localhost:4001/healthz     # {"status":"ok"}
curl http://localhost:4001/readyz       # {"ready":true,...}  (Kafka connected)
docker compose ps                       # all services "Up", redpanda "healthy"
```

### A4. Stop / clean up

```bash
docker compose down            # stop and remove containers
docker compose down -v         # also remove volumes (full reset)
```

---

## Path B — Local with pnpm (no Docker)

### B1. Enable pnpm and install

```bash
corepack enable                # provides pnpm 9 (bundled with Node 20+)
pnpm install
```

### B2. Start the gateway + web

```bash
pnpm dev
```

This starts the **gateway in standalone mode** (the deterministic market engine
runs in-process — no Kafka needed) and the **web** app together.

### B3. Open the app

http://localhost:3000 — same fully-populated terminal as Path A.

Stop with `Ctrl+C`.

> Want the full Kafka pipeline locally without Docker? That requires a running
> Kafka/Redpanda broker; just use Path A instead — it's simpler.

---

## 2. Try it out

- **Command palette:** press `/` — search screens, jump to any symbol, or run a
  scenario.
- **Navigate by keyboard:** `g` then `d` (dashboard), `w` (watchlists), `a`
  (activity), `r` (replay), `s` (settings). Press `?` for the full shortcut list.
- **Replay scenarios:** go to **/replay** and click a preset (Flash Crash, Whale
  Activity, Market Open Frenzy…). They're deterministic — the same seed replays
  identically. *(Live scenario control applies on Path B / standalone; on Path A
  the simulator owns scenario state.)*
- **Performance overlay:** command palette → *Toggle performance overlay* to see
  live fps, frame count and socket latency.
- **Resilience states:** append `?force=loading`, `?force=empty`, `?force=error`
  or `?force=disconnected` to any URL to preview those panel states.

---

## 3. Developer commands

Run from the repo root (Path B prerequisites apply):

```bash
pnpm lint        # ESLint across the workspace
pnpm typecheck   # tsc --noEmit everywhere
pnpm test        # Vitest unit + integration + component
pnpm build       # build all apps
```

End-to-end tests (need the app running on :3000 and the gateway on :4001):

```bash
# In one terminal:
pnpm dev
# In another:
pnpm --filter @pulsegrid/web exec playwright install chromium   # first time only
pnpm --filter @pulsegrid/web test:e2e
```

Capture fresh screenshots into `docs/screenshots/`:

```bash
CAPTURE=1 pnpm --filter @pulsegrid/web exec playwright test capture
```

---

## 4. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose` errors / "cannot connect to the Docker daemon" | Start Docker Desktop (or the Docker service) and retry. |
| Port already in use (3000, 4001, 9090, 3001, 19092) | Stop whatever owns the port, or edit the port mappings in `docker-compose.yml`. |
| Web loads but shows "Reconnecting…" | The gateway isn't reachable. Path A: `docker compose ps` and check the `gateway` logs (`docker compose logs gateway`). Path B: make sure `pnpm dev` is still running. |
| `ERR_PNPM_BAD_PM_VERSION` / wrong pnpm | Use Corepack: `corepack enable` (don't install a different global pnpm). |
| First `docker compose up` is slow | Expected — it installs deps and builds images once. Later runs are cached. |
| Charts blank for a second on load | Normal: the chart waits for the first candles, then streams. |

Logs:

```bash
docker compose logs -f gateway      # or simulator / aggregator / web
```

---

## 5. What's running where

| Service | Port(s) | Role |
|---|---|---|
| web | 3000 | Next.js terminal UI |
| gateway | 4001 (ws), 9101 (metrics) | WebSocket fanout to the browser |
| simulator | 9103 (control + metrics) | Generates the market, publishes to Kafka |
| aggregator | 9102 (metrics) | Builds candles + market metrics |
| redpanda | 19092 (external) | Kafka-compatible broker |
| prometheus | 9090 | Metrics scraping |
| grafana | 3001 | Dashboards |

See [`docs/architecture`](docs/architecture/README.md) for the full system
narrative and event/topic catalog.
