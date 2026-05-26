import type { SymbolStats } from '@pulsegrid/schemas';

const RETURN_WINDOW = 64; // ticks used for vol / rsi / momentum
const SPREAD_WINDOW = 64;
const ANNUALISE = 250; // display scaling for realised volatility

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Pure, streaming per-symbol microstructure statistics: VWAP, realised
 * volatility, average spread, RSI and momentum over rolling windows. No I/O —
 * trivially unit-testable, and shared by the aggregator service and the
 * in-process standalone source so both paths compute identical numbers.
 */
export class SymbolStatsTracker {
  private returns: number[] = [];
  private spreads: number[] = [];
  private lastPrice = 0;
  private cumVolume = 0;
  private cumNotional = 0;

  update(price: number, volumeDelta: number, spreadBps: number): void {
    if (this.lastPrice > 0) {
      this.returns.push(Math.log(price / this.lastPrice));
      if (this.returns.length > RETURN_WINDOW) this.returns.shift();
    }
    this.lastPrice = price;
    this.cumVolume += volumeDelta;
    this.cumNotional += volumeDelta * price;
    this.spreads.push(spreadBps);
    if (this.spreads.length > SPREAD_WINDOW) this.spreads.shift();
  }

  private rsi(): number {
    if (this.returns.length < 2) return 50;
    let gain = 0;
    let loss = 0;
    for (const r of this.returns) {
      if (r > 0) gain += r;
      else loss -= r;
    }
    if (loss === 0) return gain === 0 ? 50 : 100;
    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  }

  stats(): SymbolStats {
    const vwap = this.cumVolume > 0 ? this.cumNotional / this.cumVolume : this.lastPrice || 1;
    const realizedVolPct = stdDev(this.returns) * 100 * Math.sqrt(ANNUALISE);
    const avgSpreadBps =
      this.spreads.length > 0
        ? this.spreads.reduce((a, b) => a + b, 0) / this.spreads.length
        : 0;
    const momentumPct =
      this.returns.length > 0
        ? (Math.exp(this.returns.reduce((a, b) => a + b, 0)) - 1) * 100
        : 0;
    return { vwap, realizedVolPct, avgSpreadBps, rsi: this.rsi(), momentumPct };
  }
}
