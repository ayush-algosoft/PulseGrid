import { type SeededRng } from './rng.js';

/**
 * A market regime — the qualitative state the price process is in. Regimes give
 * the simulator memory: a symbol trends, then ranges, then spikes, rather than
 * drawing fresh random behaviour every tick (which reads as obviously fake).
 */
export type Regime = 'trend-up' | 'trend-down' | 'range' | 'high-vol';

export const REGIMES: readonly Regime[] = ['trend-up', 'trend-down', 'range', 'high-vol'];

/** Multipliers/addends a regime applies on top of the scenario base dynamics. */
export interface RegimeEffect {
  /** Added to the scenario base per-tick drift. */
  driftAdd: number;
  /** Multiplies the scenario base per-tick volatility. */
  volMult: number;
  /** Multiplies the scenario base mean-reversion strength. */
  meanRevMult: number;
  /** Multiplies the baseline spread. */
  spreadMult: number;
  /** Multiplies trade arrival intensity. */
  tradeMult: number;
}

export const REGIME_EFFECT: Record<Regime, RegimeEffect> = {
  'trend-up': { driftAdd: 0.0009, volMult: 1.0, meanRevMult: 0.2, spreadMult: 0.9, tradeMult: 1.1 },
  'trend-down': { driftAdd: -0.0011, volMult: 1.15, meanRevMult: 0.2, spreadMult: 1.3, tradeMult: 1.2 },
  range: { driftAdd: 0, volMult: 0.65, meanRevMult: 1.6, spreadMult: 0.85, tradeMult: 0.8 },
  'high-vol': { driftAdd: 0, volMult: 2.3, meanRevMult: 0.3, spreadMult: 1.9, tradeMult: 1.4 },
};

export interface RegimeState {
  regime: Regime;
  ticksLeft: number;
}

/**
 * Advance a regime state machine one tick. When the current regime expires, the
 * next is drawn from `weights` (a transition distribution) and assigned a random
 * dwell time in [minTicks, maxTicks]. Deterministic for a given RNG state.
 */
export function stepRegime(
  state: RegimeState,
  rng: SeededRng,
  weights: Record<Regime, number>,
  minTicks: number,
  maxTicks: number,
): RegimeState {
  if (state.ticksLeft > 1) {
    return { regime: state.regime, ticksLeft: state.ticksLeft - 1 };
  }
  const next = rng.weighted(
    REGIMES,
    REGIMES.map((r) => weights[r]),
  );
  return { regime: next, ticksLeft: rng.int(minTicks, maxTicks) };
}

export function initialRegime(
  rng: SeededRng,
  weights: Record<Regime, number>,
  minTicks: number,
  maxTicks: number,
): RegimeState {
  const regime = rng.weighted(
    REGIMES,
    REGIMES.map((r) => weights[r]),
  );
  return { regime, ticksLeft: rng.int(minTicks, maxTicks) };
}
