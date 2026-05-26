/**
 * Money / decimal helpers.
 *
 * Prices and sizes are represented as JS numbers but must never lose precision
 * silently or be compared with `===`. These helpers quantise to an instrument's
 * tick size and compare with an epsilon. For the value ranges this platform
 * deals in (prices < 1e7, sizes < 1e9) IEEE-754 doubles are exact enough once
 * quantised; the helpers centralise the rounding policy so call sites stay
 * honest.
 */

/** Default comparison epsilon (one millionth) for float equality. */
export const EPSILON = 1e-6;

/** Snap `value` to the nearest multiple of `step` (the instrument tick size). */
export function quantize(value: number, step: number): number {
  if (step <= 0) return value;
  const inv = 1 / step;
  // Scale, round, unscale — and round again to kill binary representation dust.
  return Math.round(Math.round(value * inv) / inv / step) * step;
}

/** Round to a fixed number of decimal places without representation dust. */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Epsilon-tolerant float equality. Never use `===` on prices/sizes. */
export function eq(a: number, b: number, epsilon = EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Epsilon-tolerant greater-than. */
export function gt(a: number, b: number, epsilon = EPSILON): boolean {
  return a - b > epsilon;
}

/** Clamp `value` into the inclusive range [min, max]. */
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Number of decimal places implied by a tick size, e.g. 0.01 -> 2. */
export function decimalsForTick(tickSize: number): number {
  if (tickSize >= 1) return 0;
  return Math.max(0, Math.ceil(-Math.log10(tickSize)));
}
