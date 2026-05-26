'use client';

import { Badge, Panel, cn } from '@pulsegrid/ui';
import { formatCompact, formatPrice, formatTime } from '@pulsegrid/utils/format';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';

import { AsyncContent } from '../AsyncContent.js';
import { useChannels, useConnection, useTrades } from '../../lib/hooks/useMarket.js';

export function TradeTapePanel({ symbol }: { symbol?: string }) {
  const channels = useMemo(() => (symbol ? [`trades:${symbol}`] : ['trades:*']), [symbol]);
  useChannels(channels);
  const trades = useTrades(symbol);
  const connection = useConnection();
  const parentRef = useRef<HTMLDivElement>(null);

  // Newest first.
  const ordered = useMemo(() => [...trades].reverse(), [trades]);

  const virtualizer = useVirtualizer({
    count: ordered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 12,
  });

  return (
    <Panel title={symbol ? `Tape · ${symbol}` : 'Trade Tape'} bare>
      <AsyncContent
        loading={ordered.length === 0 && connection === 'connecting'}
        empty={ordered.length === 0}
        connection={connection}
        emptyTitle="No prints yet"
        emptyDescription="Trades will stream in as the market moves."
      >
        <div ref={parentRef} className="h-full overflow-auto">
          <div className="sticky top-0 z-10 grid grid-cols-4 border-b border-border bg-panel px-3 py-1 text-2xs uppercase tracking-wider text-subtle">
            <span>Time</span>
            <span className="text-right">Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Side</span>
          </div>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((row) => {
              const t = ordered[row.index];
              if (!t) return null;
              const buy = t.payload.side === 'buy';
              return (
                <div
                  key={t.id}
                  className={cn(
                    'absolute inset-x-0 grid grid-cols-4 items-center px-3 text-2xs tabular-nums',
                    t.payload.isBlock && 'bg-violet/10',
                  )}
                  style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                >
                  <span className="text-subtle">{formatTime(t.ts)}</span>
                  <span className={cn('text-right', buy ? 'text-up' : 'text-down')}>
                    {formatPrice(t.payload.price)}
                  </span>
                  <span className="text-right text-muted">{formatCompact(t.payload.size)}</span>
                  <span className="flex justify-end">
                    {t.payload.isBlock ? (
                      <Badge tone="violet">BLOCK</Badge>
                    ) : (
                      <span className={buy ? 'text-up' : 'text-down'}>{buy ? 'BUY' : 'SELL'}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AsyncContent>
    </Panel>
  );
}
