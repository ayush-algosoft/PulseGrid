'use client';

import { ConnectionDot, DisconnectedBanner, MarketStatusPill, cn } from '@pulsegrid/ui';
import { formatCompact, formatPct } from '@pulsegrid/utils/format';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { useConnection, useMetrics, useStatus } from '../lib/hooks/useMarket.js';
import { getMarketClient } from '../lib/ws/marketClient.js';
import { useUiStore } from '../store/uiStore.js';

const NAV = [
  { href: '/', label: 'Dashboard', glyph: '▤', key: 'd' },
  { href: '/watchlists', label: 'Watchlists', glyph: '★', key: 'w' },
  { href: '/activity', label: 'Activity', glyph: '⚡', key: 'a' },
  { href: '/replay', label: 'Replay', glyph: '⏵', key: 'r' },
  { href: '/settings', label: 'Settings', glyph: '⚙', key: 's' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const connection = useConnection();
  const status = useStatus();
  const metrics = useMetrics();
  const setPalette = useUiStore((s) => s.setPalette);
  const setShortcuts = useUiStore((s) => s.setShortcuts);

  return (
    <div className="flex h-full">
      <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-3 lg:w-52 lg:items-stretch lg:px-2">
        <div className="mb-3 flex items-center gap-2 px-1 lg:px-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan/15 text-sm font-bold text-cyan">
            P
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground lg:inline">
            PulseGrid
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-elevated text-foreground'
                    : 'text-muted hover:bg-elevated/60 hover:text-foreground',
                )}
              >
                <span className={cn('w-4 text-center', active && 'text-cyan')}>{item.glyph}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden px-2 lg:block">
          <button
            onClick={() => setShortcuts(true)}
            className="text-2xs text-subtle hover:text-muted"
          >
            Press <span className="font-mono">?</span> for shortcuts
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <MarketStatusPill status={metrics?.status ?? 'open'} scenario={status?.scenario ?? '—'} />
          {metrics && (
            <div className="hidden items-center gap-4 text-xs md:flex">
              <span className="tabular-nums text-muted">
                Index <span className="text-foreground">{formatCompact(metrics.indexLevel)}</span>{' '}
                <span className={metrics.indexChangePct >= 0 ? 'text-up' : 'text-down'}>
                  {formatPct(metrics.indexChangePct)}
                </span>
              </span>
              <span className="tabular-nums text-muted">
                <span className="text-up">{metrics.breadth.advancers}↑</span>{' '}
                <span className="text-down">{metrics.breadth.decliners}↓</span>
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPalette(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-2xs text-subtle hover:text-muted"
            >
              <span>Search…</span>
              <span className="rounded border border-border px-1 font-mono">/</span>
            </button>
            <ConnectionDot state={connection} />
          </div>
        </header>

        {(connection === 'reconnecting' || connection === 'closed') && (
          <DisconnectedBanner
            state={connection}
            onReconnect={() => getMarketClient().reconnectNow()}
          />
        )}

        <main className="min-h-0 flex-1 overflow-auto bg-base p-3">{children}</main>
      </div>
    </div>
  );
}
