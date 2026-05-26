import type { Scenario } from '@pulsegrid/schemas';

import { type Regime } from './regime.js';

/**
 * Per-tick dynamics for a market scenario. Values are tuned for a ~250ms tick
 * (≈4 ticks/second). All log-return figures are per tick. Regimes (see
 * regime.ts) modulate these per symbol so behaviour varies across the board.
 */
export interface ScenarioConfig {
  label: string;
  description: string;
  /** Base expected log-return per tick. */
  drift: number;
  /** Base standard deviation of the per-tick log-return. */
  vol: number;
  /** Base mean-reversion strength toward the asset's anchor price. */
  meanReversion: number;
  jumpProb: number;
  jumpScale: number;
  jumpBias: number;
  /** Baseline spread in basis points. */
  spreadBps: number;
  /** Base expected trade prints per tick. */
  tradeIntensity: number;
  blockProb: number;
  newsProb: number;
  /** Multiplicative per-tick volatility decay (1 = none). */
  volDecay: number;
  /** Cross-asset correlation rho in [0, 1] applied via a common market factor. */
  correlation: number;
  /** Transition weights used by the regime state machine. */
  regimeWeights: Record<Regime, number>;
  regimeMinTicks: number;
  regimeMaxTicks: number;
  /** Flash-crash style recovery: after N ticks, drift switches to `recoveryDrift`. */
  recoveryAfterTicks?: number;
  recoveryDrift?: number;
}

export const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  showcase: {
    label: 'Showcase',
    description: 'Curated cold-open mix: trends, ranges and a volatile name side by side.',
    drift: 0.0001,
    vol: 0.0022,
    meanReversion: 0.012,
    jumpProb: 0.01,
    jumpScale: 0.01,
    jumpBias: 0,
    spreadBps: 3,
    tradeIntensity: 7,
    blockProb: 0.05,
    newsProb: 0.007,
    volDecay: 1,
    correlation: 0.35,
    regimeWeights: { 'trend-up': 3, 'trend-down': 2, range: 4, 'high-vol': 1 },
    regimeMinTicks: 160,
    regimeMaxTicks: 360,
  },
  'bull-run': {
    label: 'Bull Run',
    description: 'Sustained upward drift, expanding volume, tightening spreads.',
    drift: 0.0009,
    vol: 0.0018,
    meanReversion: 0,
    jumpProb: 0.012,
    jumpScale: 0.008,
    jumpBias: 0.6,
    spreadBps: 2,
    tradeIntensity: 8,
    blockProb: 0.03,
    newsProb: 0.006,
    volDecay: 1,
    correlation: 0.5,
    regimeWeights: { 'trend-up': 6, 'trend-down': 0.5, range: 2, 'high-vol': 1 },
    regimeMinTicks: 120,
    regimeMaxTicks: 300,
  },
  'flash-crash': {
    label: 'Flash Crash',
    description: 'Liquidity withdrawal, gap down and spread blowout, then partial recovery.',
    drift: -0.0024,
    vol: 0.0048,
    meanReversion: 0,
    jumpProb: 0.05,
    jumpScale: 0.03,
    jumpBias: -0.9,
    spreadBps: 12,
    tradeIntensity: 12,
    blockProb: 0.06,
    newsProb: 0.013,
    volDecay: 0.9995,
    correlation: 0.75,
    regimeWeights: { 'trend-up': 0.3, 'trend-down': 5, range: 1, 'high-vol': 5 },
    regimeMinTicks: 60,
    regimeMaxTicks: 160,
    recoveryAfterTicks: 220,
    recoveryDrift: 0.0007,
  },
  sideways: {
    label: 'Sideways',
    description: 'Range-bound mean reversion, low realised vol, thin tape.',
    drift: 0,
    vol: 0.001,
    meanReversion: 0.03,
    jumpProb: 0.004,
    jumpScale: 0.005,
    jumpBias: 0,
    spreadBps: 2,
    tradeIntensity: 3,
    blockProb: 0.008,
    newsProb: 0.0015,
    volDecay: 1,
    correlation: 0.2,
    regimeWeights: { 'trend-up': 1, 'trend-down': 1, range: 8, 'high-vol': 0.3 },
    regimeMinTicks: 200,
    regimeMaxTicks: 420,
  },
  'whale-activity': {
    label: 'Whale Activity',
    description: 'Periodic large block prints that visibly move the book and tape.',
    drift: 0.0001,
    vol: 0.0018,
    meanReversion: 0.01,
    jumpProb: 0.015,
    jumpScale: 0.012,
    jumpBias: 0.1,
    spreadBps: 4,
    tradeIntensity: 6,
    blockProb: 0.22,
    newsProb: 0.006,
    volDecay: 1,
    correlation: 0.3,
    regimeWeights: { 'trend-up': 2, 'trend-down': 2, range: 4, 'high-vol': 1 },
    regimeMinTicks: 120,
    regimeMaxTicks: 280,
  },
  'market-open-frenzy': {
    label: 'Market Open Frenzy',
    description: 'Opening surge: high volume, wide-then-tightening spreads, fast ticks.',
    drift: 0.0004,
    vol: 0.0066,
    meanReversion: 0.005,
    jumpProb: 0.02,
    jumpScale: 0.014,
    jumpBias: 0.2,
    spreadBps: 8,
    tradeIntensity: 14,
    blockProb: 0.04,
    newsProb: 0.009,
    volDecay: 0.9988,
    correlation: 0.45,
    regimeWeights: { 'trend-up': 3, 'trend-down': 1, range: 2, 'high-vol': 4 },
    regimeMinTicks: 80,
    regimeMaxTicks: 200,
  },
};

export const SCENARIO_LIST = Object.keys(SCENARIOS) as Scenario[];

/**
 * For the showcase scenario we pin specific symbols to specific regimes so a
 * cold open always shows a trending name, a range-bound name and a volatile
 * name simultaneously. Index maps to position in the asset universe.
 */
export const SHOWCASE_REGIME_BY_INDEX: readonly Regime[] = [
  'trend-up', // first asset trends up
  'high-vol', // second is volatile
  'trend-down', // third trends down
  'range', // fourth ranges
  'trend-up',
  'range',
  'high-vol',
  'trend-down',
];
