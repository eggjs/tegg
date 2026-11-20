import { performance } from 'node:perf_hooks';

export class EventLoopYieldUtil {
  private lastYieldAt = performance.now();

  constructor(private readonly yieldIntervalMs: number) {
    if (!Number.isFinite(yieldIntervalMs) || yieldIntervalMs < 0) {
      throw new RangeError('yieldIntervalMs must be a non-negative finite number');
    }
  }

  yieldIfNeeded(): Promise<void> | undefined {
    if (performance.now() - this.lastYieldAt < this.yieldIntervalMs) {
      return;
    }

    return new Promise<void>(resolve => {
      setImmediate(() => {
        this.lastYieldAt = performance.now();
        resolve();
      });
    });
  }
}
