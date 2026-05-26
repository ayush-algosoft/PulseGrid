'use client';

import { OrderBookLadder, Panel } from '@pulsegrid/ui';
import { formatCompact, formatPrice } from '@pulsegrid/utils/format';
import { useMemo } from 'react';

import { AsyncContent } from '../AsyncContent.js';
import { useChannels, useConnection, useOrderBook } from '../../lib/hooks/useMarket.js';
import { useSettingsStore } from '../../store/settingsStore.js';

export function OrderBookPanel({ symbol }: { symbol: string }) {
  const channels = useMemo(() => [`book:${symbol}`], [symbol]);
  useChannels(channels);
  const book = useOrderBook(symbol);
  const connection = useConnection();
  const depth = useSettingsStore((s) => s.orderBookDepth);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  return (
    <Panel title={`Order Book · ${symbol}`} bare>
      <AsyncContent loading={!book} connection={connection} emptyTitle="No depth">
        {book && (
          <OrderBookLadder
            bids={book.bids}
            asks={book.asks}
            depth={depth}
            formatPrice={formatPrice}
            formatSize={formatCompact}
            reducedMotion={reducedMotion}
          />
        )}
      </AsyncContent>
    </Panel>
  );
}
