'use client';

import { Panel } from '@pulsegrid/ui';
import { useMemo } from 'react';

import { AsyncContent } from '../AsyncContent.js';
import { TickerRow } from '../TickerRow.js';
import { useChannels, useConnection, useTicker } from '../../lib/hooks/useMarket.js';

export function WatchlistPanel({ symbols, title = 'Watchlist' }: { symbols: string[]; title?: string }) {
  const channels = useMemo(
    () => ['ticks:*', ...symbols.map((s) => `candles:${s}:1m`)],
    [symbols],
  );
  useChannels(channels);
  const connection = useConnection();
  const firstTick = useTicker(symbols[0] ?? '');

  return (
    <Panel title={title} bare>
      <AsyncContent
        loading={!firstTick && connection === 'connecting'}
        empty={symbols.length === 0}
        connection={connection}
        emptyTitle="No symbols"
        emptyDescription="Add instruments to this watchlist to track them here."
      >
        <div className="flex flex-col gap-0.5 p-1">
          {symbols.map((s) => (
            <TickerRow key={s} symbol={s} />
          ))}
        </div>
      </AsyncContent>
    </Panel>
  );
}
