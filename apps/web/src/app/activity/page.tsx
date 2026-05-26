'use client';

import { Panel, StatTile } from '@pulsegrid/ui';
import { formatCompact } from '@pulsegrid/utils/format';

import { MarketStatsPanel } from '../../components/panels/MarketStatsPanel.js';
import { NewsPanel } from '../../components/panels/NewsPanel.js';
import { TradeTapePanel } from '../../components/panels/TradeTapePanel.js';
import { useChannels, useMetrics, useTrades } from '../../lib/hooks/useMarket.js';

export default function ActivityPage() {
  useChannels(['metrics:global', 'news:global', 'trades:*']);
  const metrics = useMetrics();
  const trades = useTrades();
  const blocks = trades.filter((t) => t.payload.isBlock);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 flex flex-col gap-3 xl:col-span-4">
        <MarketStatsPanel />
        <Panel title="Large Prints">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Block prints" value={formatCompact(blocks.length)} sub="recent" />
            <StatTile
              label="Tape volume"
              value={formatCompact(trades.reduce((a, t) => a + t.payload.size, 0))}
              sub="recent"
            />
          </div>
        </Panel>
        <div className="h-[360px] [&>*]:h-full">
          <NewsPanel title="Headlines" />
        </div>
      </div>
      <div className="col-span-12 h-[640px] [&>*]:h-full xl:col-span-8">
        <TradeTapePanel />
      </div>
      {metrics && metrics.topByVolatility.length > 0 && (
        <div className="col-span-12">
          <Panel title="Most Volatile">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {metrics.topByVolatility.slice(0, 5).map((m) => (
                <StatTile
                  key={m.symbol}
                  label={m.symbol}
                  value={`${m.volatilityPct.toFixed(1)}%`}
                  sub="realised vol"
                  tone={m.volatilityPct > 30 ? 'down' : 'default'}
                />
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
