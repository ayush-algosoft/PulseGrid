'use client';

import { Panel, StatTile } from '@pulsegrid/ui';
import { formatCompact, formatPct } from '@pulsegrid/utils/format';

import { AsyncContent } from '../AsyncContent.js';
import { useConnection, useMetrics } from '../../lib/hooks/useMarket.js';

export function MarketStatsPanel() {
  const metrics = useMetrics();
  const connection = useConnection();

  return (
    <Panel title="Market Overview">
      <AsyncContent loading={!metrics} connection={connection} loadingRows={4}>
        {metrics && (
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Index"
              value={formatCompact(metrics.indexLevel)}
              sub={formatPct(metrics.indexChangePct)}
              tone={metrics.indexChangePct >= 0 ? 'up' : 'down'}
            />
            <StatTile
              label="Breadth"
              value={`${metrics.breadth.advancers} / ${metrics.breadth.decliners}`}
              sub="adv / dec"
            />
            <StatTile
              label="Volatility Index"
              value={metrics.volatilityIndex.toFixed(1)}
              sub="annualised %"
              tone={metrics.volatilityIndex > 30 ? 'down' : 'default'}
            />
            <StatTile label="Total Volume" value={formatCompact(metrics.totalVolume)} sub="session" />
          </div>
        )}
      </AsyncContent>
    </Panel>
  );
}
