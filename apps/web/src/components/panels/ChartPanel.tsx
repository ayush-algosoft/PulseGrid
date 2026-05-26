'use client';

import { TIMEFRAMES, type Timeframe } from '@pulsegrid/schemas';
import { Button, ChangeBadge, Panel, TickerValue, TimeframeSwitcher } from '@pulsegrid/ui';
import { formatPrice } from '@pulsegrid/utils/format';
import { useMemo, useState } from 'react';

import { AsyncContent } from '../AsyncContent.js';
import { PriceChart } from '../PriceChart.js';
import { useCandles, useChannels, useConnection, useTicker } from '../../lib/hooks/useMarket.js';
import { useSettingsStore } from '../../store/settingsStore.js';

export function ChartPanel({ symbol, height = 340 }: { symbol: string; height?: number }) {
  const [tf, setTf] = useState<Timeframe>('1m');
  const [kind, setKind] = useState<'candlestick' | 'area'>('candlestick');
  const channels = useMemo(() => [`ticks:${symbol}`, `candles:${symbol}:${tf}`], [symbol, tf]);
  useChannels(channels);
  const candles = useCandles(symbol, tf);
  const tick = useTicker(symbol);
  const connection = useConnection();
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  return (
    <Panel
      title={
        <span className="flex items-center gap-3">
          <span className="text-foreground">{symbol}</span>
          {tick && (
            <>
              <TickerValue
                value={tick.price}
                formatted={formatPrice(tick.price)}
                reducedMotion={reducedMotion}
                className="text-sm text-foreground"
              />
              <ChangeBadge changePct={tick.changePct} />
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setKind((k) => (k === 'candlestick' ? 'area' : 'candlestick'))}
          >
            {kind === 'candlestick' ? 'Candles' : 'Line'}
          </Button>
          <TimeframeSwitcher value={tf} options={TIMEFRAMES} onChange={setTf} />
        </>
      }
      bare
    >
      <div className="h-full p-2">
        <AsyncContent loading={candles.length < 2} connection={connection} emptyTitle="No candles">
          <PriceChart candles={candles} kind={kind} height={height} />
        </AsyncContent>
      </div>
    </Panel>
  );
}
