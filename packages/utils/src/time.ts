/** Resolve after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Leading-edge throttle: invokes `fn` at most once per `intervalMs`. Calls made
 * during the cooldown are coalesced and the most recent arguments are flushed
 * when the window elapses. Used to cap per-symbol UI update frequency.
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  intervalMs: number,
): (...args: TArgs) => void {
  let last = 0;
  let pending: TArgs | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    last = Date.now();
    timer = null;
    if (pending) {
      const args = pending;
      pending = null;
      fn(...args);
    }
  };

  return (...args: TArgs) => {
    const now = Date.now();
    const remaining = intervalMs - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else {
      pending = args;
      if (!timer) timer = setTimeout(flush, remaining);
    }
  };
}

/**
 * Collects items and flushes them as a batch either when `maxSize` is reached
 * or after `maxWaitMs`. This is how the gateway coalesces high-frequency events
 * into a small number of WebSocket frames per client.
 */
export class Batcher<T> {
  private buffer: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly onFlush: (items: T[]) => void,
    private readonly maxSize: number,
    private readonly maxWaitMs: number,
  ) {}

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxWaitMs);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;
    const items = this.buffer;
    this.buffer = [];
    this.onFlush(items);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.buffer = [];
  }
}

/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
