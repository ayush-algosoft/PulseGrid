'use client';

import { Badge, Button, Panel, cn } from '@pulsegrid/ui';

import { GATEWAY_WS_URL } from '../../lib/config.js';
import { useAssets, useConnection, useStatus } from '../../lib/hooks/useMarket.js';
import { getMarketClient } from '../../lib/ws/marketClient.js';
import { useSettingsStore } from '../../store/settingsStore.js';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="text-2xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative h-5 w-9 rounded-full border transition-colors',
        value ? 'border-cyan/40 bg-cyan/30' : 'border-border bg-surface',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-foreground transition-transform',
          value ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const assets = useAssets();
  const connection = useConnection();
  const status = useStatus();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Panel title="Appearance">
        <div className="divide-y divide-border">
          <Row label="Reduced motion" hint="Disable value flashes and transitions.">
            <Toggle value={settings.reducedMotion} onChange={(v) => settings.set({ reducedMotion: v })} />
          </Row>
          <Row label="Density" hint="Comfortable or compact layout spacing.">
            <div className="flex gap-1">
              {(['comfortable', 'compact'] as const).map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={settings.density === d ? 'accent' : 'outline'}
                  onClick={() => settings.set({ density: d })}
                >
                  {d}
                </Button>
              ))}
            </div>
          </Row>
          <Row label="Colorblind-safe" hint="Lean on glyphs and shape over hue.">
            <Toggle value={settings.colorblindSafe} onChange={(v) => settings.set({ colorblindSafe: v })} />
          </Row>
        </div>
      </Panel>

      <Panel title="Data & formatting">
        <div className="divide-y divide-border">
          <Row label="Number format" hint="Standard or compact (1.2M) figures.">
            <div className="flex gap-1">
              {(['standard', 'compact'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={settings.numberFormat === f ? 'accent' : 'outline'}
                  onClick={() => settings.set({ numberFormat: f })}
                >
                  {f}
                </Button>
              ))}
            </div>
          </Row>
          <Row label="Default symbol" hint="The instrument focused on the dashboard.">
            <select
              value={settings.defaultSymbol}
              onChange={(e) => settings.set({ defaultSymbol: e.target.value })}
              className="h-8 rounded-md border border-border bg-surface px-2 text-sm outline-none"
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Order book depth" hint="Levels shown per side.">
            <input
              type="number"
              min={5}
              max={14}
              value={settings.orderBookDepth}
              onChange={(e) => settings.set({ orderBookDepth: Number(e.target.value) })}
              className="h-8 w-20 rounded-md border border-border bg-surface px-2 text-sm tabular-nums outline-none"
            />
          </Row>
        </div>
      </Panel>

      <Panel title="Connection diagnostics">
        <div className="divide-y divide-border">
          <Row label="Gateway">
            <span className="font-mono text-2xs text-muted">{GATEWAY_WS_URL}</span>
          </Row>
          <Row label="Status">
            <Badge tone={connection === 'open' ? 'up' : connection === 'closed' ? 'down' : 'warning'}>
              {connection}
            </Badge>
          </Row>
          <Row label="Latency">
            <span className="tabular-nums text-muted">{getMarketClient().getLatency()} ms</span>
          </Row>
          {status && (
            <Row label="Engine">
              <span className="flex items-center gap-1.5 text-2xs">
                <Badge tone="violet">{status.scenario}</Badge>
                <Badge tone="neutral">seed {status.seed}</Badge>
                <Badge tone="neutral">{status.tickMs}ms</Badge>
              </span>
            </Row>
          )}
          <Row label="Reconnect" hint="Force a fresh socket + snapshot resync.">
            <Button size="sm" variant="outline" onClick={() => getMarketClient().reconnectNow()}>
              Reconnect
            </Button>
          </Row>
        </div>
      </Panel>

      <p className="px-1 text-2xs text-subtle">
        Tip: append <span className="font-mono">?force=loading|empty|error|disconnected</span> to any
        URL to preview panel resilience states.
      </p>
    </div>
  );
}
