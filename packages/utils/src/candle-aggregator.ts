import { TIMEFRAME_MS, TIMEFRAMES, type Candle, type Timeframe } from '@pulsegrid/schemas';

const HISTORY = 320;

export interface CandleUpdate {
  tf: Timeframe;
  candle: Candle;
  closed: boolean;
}

interface TfState {
  current: Candle | null;
  history: Candle[];
}

/**
 * Builds OHLCV candles for every timeframe from a single tick stream for one
 * symbol. On each update it returns the forming candle per timeframe and, when
 * a bucket rolls over, the just-closed candle flagged `closed: true`. Pure and
 * unit-tested; the aggregator service and standalone source both use it.
 */
export class CandleAggregator {
  private readonly tfs: Record<Timeframe, TfState>;

  constructor() {
    this.tfs = {} as Record<Timeframe, TfState>;
    for (const tf of TIMEFRAMES) this.tfs[tf] = { current: null, history: [] };
  }

  update(ts: number, price: number, volumeDelta: number): CandleUpdate[] {
    const updates: CandleUpdate[] = [];
    for (const tf of TIMEFRAMES) {
      const state = this.tfs[tf];
      const bucket = Math.floor(ts / TIMEFRAME_MS[tf]) * TIMEFRAME_MS[tf];
      if (!state.current || state.current.t !== bucket) {
        if (state.current) {
          state.history.push(state.current);
          if (state.history.length > HISTORY) state.history.shift();
          updates.push({ tf, candle: state.current, closed: true });
        }
        state.current = { t: bucket, o: price, h: price, l: price, c: price, v: volumeDelta };
      } else {
        state.current.h = Math.max(state.current.h, price);
        state.current.l = Math.min(state.current.l, price);
        state.current.c = price;
        state.current.v += volumeDelta;
      }
      updates.push({ tf, candle: state.current, closed: false });
    }
    return updates;
  }

  /** Recent closed candles plus the forming one for a timeframe, oldest first. */
  candles(tf: Timeframe, limit = HISTORY): Candle[] {
    const state = this.tfs[tf];
    const all = state.current ? [...state.history, state.current] : [...state.history];
    return all.slice(-limit);
  }
}
