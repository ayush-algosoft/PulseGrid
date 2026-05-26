import type { Level, Side } from '@pulsegrid/schemas';

import { quantize } from './decimal.js';
import { type SeededRng } from './rng.js';

/**
 * A persistent two-sided order book. Resting size lives across ticks: it
 * replenishes toward a depth-shaped target (more size away from mid) and is
 * consumed by aggressing trades, so the ladder visibly moves and refills rather
 * than being redrawn from scratch each frame.
 */
export class OrderBookSim {
  private readonly bidSizes: number[];
  private readonly askSizes: number[];
  private readonly targets: number[];

  constructor(
    private readonly depth: number,
    baseSize: number,
  ) {
    this.targets = Array.from({ length: depth }, (_, i) => baseSize * (1 + i * 0.4));
    this.bidSizes = [...this.targets];
    this.askSizes = [...this.targets];
  }

  /** Replenish both sides toward target depth with a little noise. */
  refresh(rng: SeededRng): void {
    for (let i = 0; i < this.depth; i += 1) {
      const target = this.targets[i] as number;
      this.bidSizes[i] = Math.max(
        0,
        (this.bidSizes[i] as number) * 0.7 + target * 0.3 * rng.range(0.85, 1.2),
      );
      this.askSizes[i] = Math.max(
        0,
        (this.askSizes[i] as number) * 0.7 + target * 0.3 * rng.range(0.85, 1.2),
      );
    }
  }

  /** An aggressing trade eats resting size from the far side, best level first. */
  consume(side: Side, qty: number): void {
    const sizes = side === 'buy' ? this.askSizes : this.bidSizes;
    let remaining = qty;
    for (let i = 0; i < this.depth && remaining > 0; i += 1) {
      const available = sizes[i] as number;
      const taken = Math.min(available, remaining);
      sizes[i] = available - taken;
      remaining -= taken;
    }
  }

  /** Build a top-N snapshot around `mid`, plus the bid/ask imbalance in [-1,1]. */
  snapshot(
    mid: number,
    halfSpread: number,
    tickSize: number,
  ): { bids: Level[]; asks: Level[]; imbalance: number } {
    const step = Math.max(tickSize, mid * 0.0001);
    const bids: Level[] = [];
    const asks: Level[] = [];
    let bidTotal = 0;
    let askTotal = 0;
    for (let i = 0; i < this.depth; i += 1) {
      const bidPrice = quantize(mid - halfSpread - i * step, tickSize);
      const askPrice = quantize(mid + halfSpread + i * step, tickSize);
      const bidSize = Number((this.bidSizes[i] as number).toFixed(4));
      const askSize = Number((this.askSizes[i] as number).toFixed(4));
      bids.push([Math.max(bidPrice, tickSize), bidSize]);
      asks.push([askPrice, askSize]);
      bidTotal += bidSize;
      askTotal += askSize;
    }
    const denom = bidTotal + askTotal;
    const imbalance = denom > 0 ? (bidTotal - askTotal) / denom : 0;
    return { bids, asks, imbalance: Math.max(-1, Math.min(1, imbalance)) };
  }
}
