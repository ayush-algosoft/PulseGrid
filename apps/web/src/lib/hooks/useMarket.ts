'use client';

import { type Candle, type NewsEvent, type TradeEvent } from '@pulsegrid/types';
import { useEffect, useMemo } from 'react';

import { getMarketClient } from '../ws/marketClient.js';
import { useMarketStore, type SymbolTick } from '../../store/marketStore.js';

export function useConnection() {
  return useMarketStore((s) => s.connection);
}

export function useStatus() {
  return useMarketStore((s) => s.status);
}

export function useAssets() {
  return useMarketStore((s) => s.assets);
}

export function useMetrics() {
  return useMarketStore((s) => s.metrics);
}

export function useTicker(symbol: string): SymbolTick | undefined {
  return useMarketStore((s) => s.tickBySymbol[symbol]);
}

export function useStats(symbol: string) {
  return useMarketStore((s) => s.statsBySymbol[symbol]);
}

export function useOrderBook(symbol: string) {
  return useMarketStore((s) => s.orderbookBySymbol[symbol]);
}

export function useCandles(symbol: string, tf: string): Candle[] {
  const empty = useMemo<Candle[]>(() => [], []);
  return useMarketStore((s) => s.candlesByKey[`${symbol}:${tf}`] ?? empty);
}

export function useTrades(symbol?: string): TradeEvent[] {
  const trades = useMarketStore((s) => s.trades);
  return useMemo(
    () => (symbol ? trades.filter((t) => t.symbol === symbol) : trades),
    [trades, symbol],
  );
}

export function useNews(symbol?: string): NewsEvent[] {
  const news = useMarketStore((s) => s.news);
  return useMemo(
    () => (symbol ? news.filter((n) => n.symbol === symbol) : news),
    [news, symbol],
  );
}

/**
 * Subscribe to a set of gateway channels for the lifetime of the calling
 * component. Refcounted in the client, so overlapping subscriptions are safe.
 */
export function useChannels(channels: string[]): void {
  const key = channels.join(',');
  useEffect(() => {
    if (channels.length === 0) return;
    const client = getMarketClient();
    client.subscribe(channels);
    return () => client.unsubscribe(channels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
