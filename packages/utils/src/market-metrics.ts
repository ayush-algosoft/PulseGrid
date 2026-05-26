import type {
  Breadth,
  MarketMetricsPayload,
  MarketStatus,
  Mover,
  Scenario,
} from '@pulsegrid/schemas';

import { eq } from './decimal.js';

/** Per-symbol input to the global metrics builder. */
export interface SymbolSnapshot {
  symbol: string;
  price: number;
  open: number;
  changePct: number;
  volume: number;
  volatilityPct: number;
}

const INDEX_BASE = 1000;

function toMover(s: SymbolSnapshot): Mover {
  return {
    symbol: s.symbol,
    price: s.price,
    changePct: s.changePct,
    volume: s.volume,
    volatilityPct: s.volatilityPct,
  };
}

/**
 * Pure builder for the global market metrics: breadth, an equal-weighted index
 * level, aggregate volatility and the three top-movers leaderboards. No I/O, so
 * the aggregator service is a thin shell around this.
 */
export function buildMarketMetrics(
  snapshots: SymbolSnapshot[],
  status: MarketStatus,
  scenario: Scenario,
  topN = 5,
): MarketMetricsPayload {
  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  let totalVolume = 0;
  let volSum = 0;
  let indexRatioSum = 0;

  for (const s of snapshots) {
    if (eq(s.changePct, 0, 0.01)) unchanged += 1;
    else if (s.changePct > 0) advancers += 1;
    else decliners += 1;
    totalVolume += s.volume;
    volSum += s.volatilityPct;
    indexRatioSum += s.open > 0 ? s.price / s.open : 1;
  }

  const n = Math.max(snapshots.length, 1);
  const indexLevel = INDEX_BASE * (indexRatioSum / n);
  const breadth: Breadth = { advancers, decliners, unchanged };

  const byChange = [...snapshots].sort((a, b) => b.changePct - a.changePct);
  const byVolume = [...snapshots].sort((a, b) => b.volume - a.volume);
  const byVol = [...snapshots].sort((a, b) => b.volatilityPct - a.volatilityPct);

  return {
    status,
    scenario,
    breadth,
    indexLevel,
    indexChangePct: (indexLevel / INDEX_BASE - 1) * 100,
    volatilityIndex: volSum / n,
    totalVolume,
    topByChange: byChange.slice(0, topN).map(toMover),
    topByVolume: byVolume.slice(0, topN).map(toMover),
    topByVolatility: byVol.slice(0, topN).map(toMover),
  };
}
