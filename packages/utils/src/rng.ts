/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * Given the same seed, the exact same sequence is produced on every run and on
 * every platform — this is what makes simulator scenarios replayable. The
 * generator is fast and has good statistical properties for simulation use
 * (it is NOT cryptographically secure, and must never be used for security).
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force into a 32-bit unsigned integer space.
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Returns true with probability `p`. */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** Standard-normal sample via the Box-Muller transform. */
  normal(mean = 0, stdDev = 1): number {
    const u1 = Math.max(this.next(), Number.EPSILON);
    const u2 = this.next();
    const mag = Math.sqrt(-2 * Math.log(u1));
    return mean + stdDev * mag * Math.cos(2 * Math.PI * u2);
  }

  /** Pick a uniformly random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('SeededRng.pick: empty array');
    return items[this.int(0, items.length - 1)] as T;
  }

  /**
   * Weighted pick: `weights` parallels `items` and need not sum to 1.
   * Deterministic for a given RNG state.
   */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0 || items.length !== weights.length) {
      throw new Error('SeededRng.weighted: invalid input');
    }
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i += 1) {
      r -= weights[i] as number;
      if (r <= 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  /**
   * Produce a RFC-4122-formatted v4 UUID derived from this generator. Because
   * the bytes come from the seeded stream, replaying the same seed yields the
   * same ids — preserving idempotency keys across deterministic replays.
   */
  uuid(): string {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) bytes[i] = this.int(0, 255);
    bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
    const hex: string[] = [];
    for (let i = 0; i < 256; i += 1) hex.push((i + 0x100).toString(16).slice(1));
    const b = (i: number) => hex[bytes[i] as number];
    return (
      `${b(0)}${b(1)}${b(2)}${b(3)}-${b(4)}${b(5)}-${b(6)}${b(7)}-` +
      `${b(8)}${b(9)}-${b(10)}${b(11)}${b(12)}${b(13)}${b(14)}${b(15)}`
    );
  }

  /** Snapshot the internal state so a run can be paused and resumed exactly. */
  snapshot(): number {
    return this.state;
  }

  restore(state: number): void {
    this.state = state >>> 0;
  }
}
