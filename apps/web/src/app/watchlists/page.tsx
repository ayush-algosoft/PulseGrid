'use client';

import { Button, ChangeBadge, EmptyState, Panel, Sparkline, cn } from '@pulsegrid/ui';
import { formatPrice } from '@pulsegrid/utils/format';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useAssets, useChannels } from '../../lib/hooks/useMarket.js';
import { useMarketStore } from '../../store/marketStore.js';
import { useWatchlistStore } from '../../store/watchlistStore.js';

type SortKey = 'symbol' | 'price' | 'changePct';

export default function WatchlistsPage() {
  const lists = useWatchlistStore((s) => s.watchlists);
  const activeId = useWatchlistStore((s) => s.activeId);
  const setActive = useWatchlistStore((s) => s.setActive);
  const addList = useWatchlistStore((s) => s.addList);
  const removeList = useWatchlistStore((s) => s.removeList);
  const addSymbol = useWatchlistStore((s) => s.addSymbol);
  const removeSymbol = useWatchlistStore((s) => s.removeSymbol);

  const assets = useAssets();
  const active = lists.find((l) => l.id === activeId) ?? lists[0];
  const symbols = useMemo(() => active?.symbols ?? [], [active]);
  const channels = useMemo(() => ['ticks:*', ...symbols.map((s) => `candles:${s}:1m`)], [symbols]);
  useChannels(channels);

  const tickBySymbol = useMarketStore((s) => s.tickBySymbol);
  const candlesByKey = useMarketStore((s) => s.candlesByKey);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'changePct', dir: -1 });

  const rows = useMemo(() => {
    const data = symbols.map((sym) => ({ sym, tick: tickBySymbol[sym] }));
    return data.sort((a, b) => {
      const m = sort.dir;
      if (sort.key === 'symbol') return a.sym.localeCompare(b.sym) * m;
      const av = sort.key === 'price' ? (a.tick?.price ?? 0) : (a.tick?.changePct ?? 0);
      const bv = sort.key === 'price' ? (b.tick?.price ?? 0) : (b.tick?.changePct ?? 0);
      return (av - bv) * m;
    });
  }, [symbols, tickBySymbol, sort]);

  const available = assets.filter((a) => !symbols.includes(a.symbol));

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  const Header = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={cn('text-2xs uppercase tracking-wider text-subtle hover:text-muted', className)}
    >
      {label}
      {sort.key === k ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActive(l.id)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm',
              l.id === activeId
                ? 'border-cyan/40 bg-cyan/10 text-foreground'
                : 'border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            {l.name}
            <span className="text-2xs text-subtle">{l.symbols.length}</span>
          </button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const name = window.prompt('New watchlist name');
            if (name) addList(name);
          }}
        >
          + List
        </Button>
        {active && lists.length > 1 && (
          <Button size="sm" variant="ghost" onClick={() => removeList(active.id)}>
            Remove list
          </Button>
        )}
      </div>

      <Panel
        title={active ? active.name : 'Watchlist'}
        actions={
          available.length > 0 && active ? (
            <select
              value=""
              onChange={(e) => e.target.value && addSymbol(active.id, e.target.value)}
              className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-muted outline-none"
            >
              <option value="">+ Add symbol…</option>
              {available.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} — {a.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
        bare
      >
        {symbols.length === 0 ? (
          <EmptyState title="Empty watchlist" description="Add instruments using the menu above." />
        ) : (
          <div className="overflow-auto">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-border px-3 py-1.5">
              <Header k="symbol" label="Symbol" />
              <span className="text-right text-2xs uppercase tracking-wider text-subtle">Trend</span>
              <Header k="price" label="Last" className="text-right" />
              <Header k="changePct" label="Change" className="text-right" />
              <span />
            </div>
            {rows.map(({ sym, tick }) => (
              <div
                key={sym}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2 text-sm hover:bg-elevated/40"
              >
                <Link href={`/asset/${sym}`} className="font-medium text-foreground hover:text-cyan">
                  {sym}
                </Link>
                <span className="flex justify-end">
                  <Sparkline
                    data={(candlesByKey[`${sym}:1m`] ?? []).slice(-32).map((c) => c.c)}
                    positive={(tick?.changePct ?? 0) >= 0}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground">
                  {tick ? formatPrice(tick.price) : '—'}
                </span>
                <span className="flex justify-end">
                  <ChangeBadge changePct={tick?.changePct ?? 0} />
                </span>
                <button
                  onClick={() => active && removeSymbol(active.id, sym)}
                  className="text-subtle hover:text-down"
                  aria-label={`Remove ${sym}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
