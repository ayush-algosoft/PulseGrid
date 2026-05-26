'use client';

import { Badge, Panel } from '@pulsegrid/ui';
import { formatTime } from '@pulsegrid/utils/format';
import { useMemo } from 'react';

import { AsyncContent } from '../AsyncContent.js';
import { useChannels, useConnection, useNews } from '../../lib/hooks/useMarket.js';
import { type Sentiment, type Severity } from '@pulsegrid/types';

const SENTIMENT_TONE: Record<Sentiment, 'up' | 'down' | 'neutral'> = {
  bullish: 'up',
  bearish: 'down',
  neutral: 'neutral',
};

const SEVERITY_TONE: Record<Severity, 'neutral' | 'warning' | 'down'> = {
  info: 'neutral',
  notable: 'warning',
  critical: 'down',
};

export function NewsPanel({ symbol, title = 'Market Activity' }: { symbol?: string; title?: string }) {
  const channels = useMemo(() => (symbol ? [`news:${symbol}`] : ['news:global']), [symbol]);
  useChannels(channels);
  const news = useNews(symbol);
  const connection = useConnection();
  const ordered = useMemo(() => [...news].reverse(), [news]);

  return (
    <Panel title={title} bare>
      <AsyncContent
        loading={ordered.length === 0 && connection === 'connecting'}
        empty={ordered.length === 0}
        connection={connection}
        emptyTitle="Quiet tape"
        emptyDescription="Notable headlines and regime changes will appear here."
      >
        <ul className="flex flex-col divide-y divide-border overflow-auto">
          {ordered.map((n) => (
            <li key={n.id} className="flex flex-col gap-1 px-3 py-2">
              <div className="flex items-center gap-2 text-2xs text-subtle">
                <span className="font-mono">{formatTime(n.ts)}</span>
                <Badge tone={SENTIMENT_TONE[n.payload.sentiment]}>{n.symbol}</Badge>
                <Badge tone={SEVERITY_TONE[n.payload.severity]}>{n.payload.severity}</Badge>
                <span className="ml-auto">{n.payload.source}</span>
              </div>
              <p className="text-xs text-foreground">{n.payload.headline}</p>
            </li>
          ))}
        </ul>
      </AsyncContent>
    </Panel>
  );
}
