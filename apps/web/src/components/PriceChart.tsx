'use client';

import { type Candle } from '@pulsegrid/types';
import { chartTheme } from '@pulsegrid/ui/tokens';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// echarts touches the DOM, so it must never render on the server.
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface PriceChartProps {
  candles: Candle[];
  kind?: 'candlestick' | 'area';
  height?: number;
  showVolume?: boolean;
}

function fmtTime(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Streaming price chart. ECharts diffs the option on each update rather than
 * re-rendering from scratch, which keeps high-frequency candle updates smooth.
 */
export function PriceChart({ candles, kind = 'candlestick', height = 320, showVolume = true }: PriceChartProps) {
  const option = useMemo(() => {
    const times = candles.map((c) => fmtTime(c.t));
    const axis = {
      type: 'category' as const,
      data: times,
      axisLine: { lineStyle: { color: chartTheme.axis } },
      axisLabel: { color: chartTheme.text, fontSize: 10, hideOverlap: true },
      axisTick: { show: false },
      splitLine: { show: false },
    };
    const grid = showVolume
      ? [
          { left: 56, right: 16, top: 12, height: '66%' },
          { left: 56, right: 16, top: '74%', height: '18%' },
        ]
      : [{ left: 56, right: 16, top: 12, bottom: 28 }];

    const series: Record<string, unknown>[] = [];
    if (kind === 'candlestick') {
      series.push({
        type: 'candlestick',
        data: candles.map((c) => [c.o, c.c, c.l, c.h]),
        itemStyle: {
          color: chartTheme.up,
          color0: chartTheme.down,
          borderColor: chartTheme.up,
          borderColor0: chartTheme.down,
        },
      });
    } else {
      series.push({
        type: 'line',
        data: candles.map((c) => c.c),
        showSymbol: false,
        lineStyle: { color: chartTheme.line, width: 1.5 },
        areaStyle: { color: chartTheme.area },
      });
    }
    if (showVolume) {
      series.push({
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: candles.map((c) => ({
          value: c.v,
          itemStyle: { color: c.c >= c.o ? 'rgba(52,211,153,0.4)' : 'rgba(244,63,94,0.4)' },
        })),
      });
    }

    return {
      animation: false,
      backgroundColor: 'transparent',
      grid,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#161a21',
        borderColor: '#232934',
        textStyle: { color: '#e7eaf0', fontSize: 11 },
      },
      xAxis: showVolume
        ? [axis, { ...axis, gridIndex: 1, axisLabel: { show: false } }]
        : [axis],
      yAxis: showVolume
        ? [
            {
              scale: true,
              position: 'left',
              axisLabel: { color: chartTheme.text, fontSize: 10 },
              splitLine: { lineStyle: { color: chartTheme.grid } },
            },
            { gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } },
          ]
        : [
            {
              scale: true,
              axisLabel: { color: chartTheme.text, fontSize: 10 },
              splitLine: { lineStyle: { color: chartTheme.grid } },
            },
          ],
      series,
    };
  }, [candles, kind, showVolume]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge={false}
      lazyUpdate
      opts={{ renderer: 'canvas' }}
    />
  );
}
