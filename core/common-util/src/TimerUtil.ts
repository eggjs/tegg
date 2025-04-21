class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class TimerUtil {
  static TimeoutError = TimeoutError;

  static async sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  static async timeout<T>(fn: () => Promise<T>, ms?: number): Promise<T> {
    if (!ms) {
      return await fn();
    }

    let timer: NodeJS.Timeout;
    const promise = new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new TimeoutError('timeout')), ms);
      fn().then(resolve).catch(reject);
    });

    return await promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }
}
