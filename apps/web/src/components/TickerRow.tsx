'use client';

import { ChangeBadge, Sparkline, TickerValue, cn } from '@pulsegrid/ui';
import { formatPrice } from '@pulsegrid/utils/format';
import Link from 'next/link';
import { memo } from 'react';

import { useCandles, useTicker } from '../lib/hooks/useMarket.js';
import { useSettingsStore } from '../store/settingsStore.js';

/**
 * One watchlist/board row. Memoised and reading the store at the leaf via narrow
 * selectors, so a tick for one symbol never re-renders the others.
 */
export const TickerRow = memo(function TickerRow({ symbol }: { symbol: string }) {
  const tick = useTicker(symbol);
  const candles = useCandles(symbol, '1m');
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const spark = candles.slice(-32).map((c) => c.c);

  return (
    <Link
      href={`/asset/${symbol}`}
      className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-elevated/60"
    >
      <span className="truncate font-medium text-foreground">{symbol}</span>
      <Sparkline data={spark} positive={(tick?.changePct ?? 0) >= 0} />
      <span className="flex flex-col items-end">
        <TickerValue
          value={tick?.price ?? 0}
          formatted={tick ? formatPrice(tick.price) : '—'}
          reducedMotion={reducedMotion}
          className={cn('text-sm tabular-nums text-foreground')}
        />
        <ChangeBadge changePct={tick?.changePct ?? 0} className="text-2xs" />
      </span>
    </Link>
  );
});
