'use client';

import { Badge, Button, Panel, cn } from '@pulsegrid/ui';
import { SCENARIO_LIST, SCENARIOS } from '@pulsegrid/utils/scenarios';
import { type Scenario } from '@pulsegrid/types';
import { useState } from 'react';

import { ChartPanel } from '../../components/panels/ChartPanel.js';
import { TopMoversPanel } from '../../components/panels/TopMoversPanel.js';
import { useChannels, useStatus } from '../../lib/hooks/useMarket.js';
import { getMarketClient } from '../../lib/ws/marketClient.js';
import { useSettingsStore } from '../../store/settingsStore.js';

const SPEEDS = [0.5, 1, 2, 4];
const PRESETS: { scenario: Scenario; blurb: string }[] = [
  { scenario: 'flash-crash', blurb: 'Gap down, spread blowout, partial recovery.' },
  { scenario: 'whale-activity', blurb: 'Repeated block prints move the book.' },
  { scenario: 'market-open-frenzy', blurb: 'Opening surge then tightening.' },
  { scenario: 'bull-run', blurb: 'Sustained upward drift.' },
];

export default function ReplayPage() {
  useChannels(['metrics:global']);
  const status = useStatus();
  const focus = useSettingsStore((s) => s.defaultSymbol);
  const [seed, setSeed] = useState(42);
  const client = getMarketClient();

  const running = status?.running ?? true;
  const scenario = status?.scenario;

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Scenario Replay">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Drive the simulation into a known regime. Scenarios are deterministic given a seed — a
            walkthrough looks identical every run. (Live control applies in standalone mode; under
            the full Kafka deployment the simulator owns scenario state.)
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant={running ? 'danger' : 'accent'} onClick={() => client.control({ command: running ? 'pause' : 'play' })}>
              {running ? '❚❚ Pause' : '▶ Play'}
            </Button>

            <div className="flex items-center gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-subtle">Speed</span>
              {SPEEDS.map((sp) => (
                <Button
                  key={sp}
                  size="sm"
                  variant={status?.speed === sp ? 'accent' : 'outline'}
                  onClick={() => client.control({ command: 'setSpeed', speed: sp })}
                >
                  {sp}×
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-subtle">Seed</span>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
              />
              <Button size="sm" variant="outline" onClick={() => client.control({ command: 'reseed', seed })}>
                Reseed
              </Button>
            </div>

            {status && (
              <div className="ml-auto flex items-center gap-2 text-2xs text-muted">
                <Badge tone={running ? 'up' : 'warning'}>{running ? 'PLAYING' : 'PAUSED'}</Badge>
                <Badge tone="violet">{scenario}</Badge>
                <Badge tone="neutral">seed {status.seed}</Badge>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-2xs uppercase tracking-wider text-subtle">Scenarios</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {SCENARIO_LIST.map((s) => (
                <button
                  key={s}
                  onClick={() => client.control({ command: 'setScenario', scenario: s })}
                  className={cn(
                    'rounded-md border p-2 text-left text-xs transition-colors',
                    scenario === s
                      ? 'border-cyan/40 bg-cyan/10 text-foreground'
                      : 'border-border bg-surface text-muted hover:border-border-strong',
                  )}
                >
                  <div className="font-medium">{SCENARIOS[s].label}</div>
                  <div className="mt-0.5 text-2xs text-subtle">{SCENARIOS[s].description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-2xs uppercase tracking-wider text-subtle">Demo presets</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p.scenario}
                  onClick={() => client.control({ command: 'setScenario', scenario: p.scenario })}
                  className="rounded-md border border-border bg-surface p-3 text-left hover:border-violet/40"
                >
                  <div className="text-sm font-medium text-foreground">{SCENARIOS[p.scenario].label}</div>
                  <div className="mt-1 text-2xs text-muted">{p.blurb}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 xl:col-span-8">
          <ChartPanel symbol={focus} height={360} />
        </div>
        <div className="col-span-12 h-[400px] [&>*]:h-full xl:col-span-4">
          <TopMoversPanel />
        </div>
      </div>
    </div>
  );
}
