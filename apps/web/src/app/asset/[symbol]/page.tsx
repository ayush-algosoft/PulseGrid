'use client';

import { ChangeBadge, Panel, StatTile, TickerValue } from '@pulsegrid/ui';
import { formatCompact, formatPrice } from '@pulsegrid/utils/format';
import { useParams } from 'next/navigation';

import { ChartPanel } from '../../../components/panels/ChartPanel.js';
import { NewsPanel } from '../../../components/panels/NewsPanel.js';
import { OrderBookPanel } from '../../../components/panels/OrderBookPanel.js';
import { TradeTapePanel } from '../../../components/panels/TradeTapePanel.js';
import { useChannels, useStats, useTicker } from '../../../lib/hooks/useMarket.js';
import { useSettingsStore } from '../../../store/settingsStore.js';

export default function AssetPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol ?? 'BTCUSD').toUpperCase();
  useChannels([`ticks:${symbol}`, 'metrics:global']);
  const tick = useTicker(symbol);
  const stats = useStats(symbol);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{symbol}</h1>
          <div className="mt-1 flex items-center gap-3">
            <TickerValue
              value={tick?.price ?? 0}
              formatted={tick ? formatPrice(tick.price) : '—'}
              reducedMotion={reducedMotion}
              className="text-xl text-foreground"
            />
            <ChangeBadge changePct={tick?.changePct ?? 0} className="text-base" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <StatTile label="VWAP" value={stats ? formatPrice(stats.vwap) : '—'} />
          <StatTile
            label="Realised Vol"
            value={stats ? `${stats.realizedVolPct.toFixed(1)}%` : '—'}
            tone={stats && stats.realizedVolPct > 30 ? 'down' : 'default'}
          />
          <StatTile label="Spread" value={stats ? `${stats.avgSpreadBps.toFixed(1)} bps` : '—'} />
          <StatTile
            label="RSI"
            value={stats ? stats.rsi.toFixed(0) : '—'}
            tone={stats ? (stats.rsi > 70 ? 'down' : stats.rsi < 30 ? 'up' : 'default') : 'default'}
          />
          <StatTile
            label="Momentum"
            value={stats ? `${stats.momentumPct.toFixed(2)}%` : '—'}
            tone={stats ? (stats.momentumPct >= 0 ? 'up' : 'down') : 'default'}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 flex flex-col gap-3 xl:col-span-8">
          <ChartPanel symbol={symbol} height={420} />
          <div className="h-[320px] [&>*]:h-full">
            <TradeTapePanel symbol={symbol} />
          </div>
        </div>
        <div className="col-span-12 flex flex-col gap-3 xl:col-span-4">
          <div className="h-[420px] [&>*]:h-full">
            <OrderBookPanel symbol={symbol} />
          </div>
          <div className="h-[320px] [&>*]:h-full">
            <NewsPanel symbol={symbol} title={`${symbol} News`} />
          </div>
        </div>
      </div>

      {tick && (
        <Panel title="Session">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Open" value={formatPrice(tick.open)} />
            <StatTile label="High" value={formatPrice(tick.high)} tone="up" />
            <StatTile label="Low" value={formatPrice(tick.low)} tone="down" />
            <StatTile label="Volume" value={formatCompact(tick.volume)} />
          </div>
        </Panel>
      )}
    </div>
  );
}
