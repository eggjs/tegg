import Profile from 'time-profile';

export class Timing {
  #profile: Profile;

  constructor() {
    this.#profile = new Profile();
  }

  start(name: string) {
    this.#profile.start(name);

    return {
      end: () => this.end(name),
    };
  }

  end(name: string) {
    this.#profile.end(name);
  }

  runSync<T>(fn: () => T, name: string): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  async run<T>(fn: () => Promise<T>, name: string): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  toString() {
    return this.#profile.toString();
  }
}

interface TimingTarget {
  timing: Timing;
}

export function TimeConsuming<F extends(...args: any) => any>(name?: ((...args: Parameters<F>) => string) | string) {
  return function(_: TimingTarget, propertyKey: string, descriptor: TypedPropertyDescriptor<F>) {
    const originalMethod = descriptor.value!;

    const possibleName = name || propertyKey;
    descriptor.value = function(this: TimingTarget, ...args: Parameters<F>) {
      const timingName = typeof possibleName === 'function' ? possibleName(...args) : possibleName;
      try {
        this.timing.start(timingName);
        return originalMethod.apply(this, args);
      } finally {
        this.timing.end(timingName);
      }
    } as F;
  };
}
