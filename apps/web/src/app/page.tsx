'use client';

import { useChannels } from '../lib/hooks/useMarket.js';
import { ChartPanel } from '../components/panels/ChartPanel.js';
import { MarketStatsPanel } from '../components/panels/MarketStatsPanel.js';
import { NewsPanel } from '../components/panels/NewsPanel.js';
import { OrderBookPanel } from '../components/panels/OrderBookPanel.js';
import { TopMoversPanel } from '../components/panels/TopMoversPanel.js';
import { TradeTapePanel } from '../components/panels/TradeTapePanel.js';
import { WatchlistPanel } from '../components/panels/WatchlistPanel.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useWatchlistStore } from '../store/watchlistStore.js';

export default function DashboardPage() {
  useChannels(['metrics:global', 'news:global']);
  const focus = useSettingsStore((s) => s.defaultSymbol);
  const lists = useWatchlistStore((s) => s.watchlists);
  const activeId = useWatchlistStore((s) => s.activeId);
  const symbols = lists.find((l) => l.id === activeId)?.symbols ?? lists[0]?.symbols ?? [];

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 flex flex-col gap-3 xl:col-span-3">
        <MarketStatsPanel />
        <div className="h-[440px] [&>*]:h-full">
          <WatchlistPanel symbols={symbols} title="Board" />
        </div>
      </div>

      <div className="col-span-12 flex flex-col gap-3 xl:col-span-6">
        <ChartPanel symbol={focus} height={360} />
        <div className="h-[300px] [&>*]:h-full">
          <TradeTapePanel symbol={focus} />
        </div>
      </div>

      <div className="col-span-12 flex flex-col gap-3 xl:col-span-3">
        <div className="h-[360px] [&>*]:h-full">
          <OrderBookPanel symbol={focus} />
        </div>
        <div className="h-[360px] [&>*]:h-full">
          <TopMoversPanel />
        </div>
      </div>

      <div className="col-span-12 h-[240px] [&>*]:h-full">
        <NewsPanel />
      </div>
    </div>
  );
}
