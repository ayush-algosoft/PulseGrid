import type {
  Candle,
  MarketMetricsPayload,
  MarketStatus,
  Scenario,
  SymbolStats,
  Timeframe,
} from '@pulsegrid/schemas';

import { CandleAggregator, type CandleUpdate } from './candle-aggregator.js';
import { buildMarketMetrics, type SymbolSnapshot } from './market-metrics.js';
import { SymbolStatsTracker } from './symbol-stats.js';

export interface DeriveInput {
  symbol: string;
  ts: number;
  price: number;
  open: number;
  changePct: number;
  volumeDelta: number;
  spreadBps: number;
}

export interface DeriveResult {
  candleUpdates: CandleUpdate[];
  stats: SymbolStats;
}

interface SymbolDeriveState {
  candles: CandleAggregator;
  stats: SymbolStatsTracker;
  volume: number;
  snapshot: SymbolSnapshot;
}

/**
 * Derives candles, per-symbol stats and global market metrics from a tick
 * stream. This is the entire analytical core of the aggregator service and is
 * reused verbatim by the gateway's standalone source — guaranteeing the Kafka
 * and in-process paths produce identical derived state.
 */
export class MarketDeriver {
  private readonly states = new Map<string, SymbolDeriveState>();

  private stateFor(symbol: string): SymbolDeriveState {
    let state = this.states.get(symbol);
    if (!state) {
      state = {
        candles: new CandleAggregator(),
        stats: new SymbolStatsTracker(),
        volume: 0,
        snapshot: { symbol, price: 0, open: 0, changePct: 0, volume: 0, volatilityPct: 0 },
      };
      this.states.set(symbol, state);
    }
    return state;
  }

  ingestTick(input: DeriveInput): DeriveResult {
    const state = this.stateFor(input.symbol);
    state.stats.update(input.price, input.volumeDelta, input.spreadBps);
    state.volume += input.volumeDelta;
    const stats = state.stats.stats();
    const candleUpdates = state.candles.update(input.ts, input.price, input.volumeDelta);
    state.snapshot = {
      symbol: input.symbol,
      price: input.price,
      open: input.open,
      changePct: input.changePct,
      volume: state.volume,
      volatilityPct: stats.realizedVolPct,
    };
    return { candleUpdates, stats };
  }

  globalMetrics(status: MarketStatus, scenario: Scenario): MarketMetricsPayload {
    return buildMarketMetrics([...this.states.values()].map((s) => s.snapshot), status, scenario);
  }

  candles(symbol: string, tf: Timeframe, limit?: number): Candle[] {
    return this.states.get(symbol)?.candles.candles(tf, limit) ?? [];
  }

  stats(symbol: string): SymbolStats | undefined {
    return this.states.get(symbol)?.stats.stats();
  }
}
