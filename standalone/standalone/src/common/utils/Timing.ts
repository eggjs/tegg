import { getProfiler } from 'time-profile';

export class Timing {
  static #profile?: any;

  static enable(profile: string | any) {
    if (typeof profile === 'string') {
      Timing.#profile = getProfiler(profile);
    } else if (typeof profile === 'object') {
      Timing.#profile = profile;
    }
  }

  static start(name: string) {
    this.#profile?.start(name);

    return {
      end: () => this.end(name),
    };
  }

  static end(name: string) {
    this.#profile?.end(name);
  }

  static profile<F extends() => any>(fn: F, name: string): ReturnType<F> {
    if (!this.#profile) {
      return fn();
    }
    return this.#profile.profileTagged(fn, name);
  }

  static toString(destroy?: boolean) {
    const str = this.#profile?.toString();
    if (destroy) {
      this.#profile?.destroy();
    }
    return str;
  }
}

export function TimeProfile() {
  return function(_: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value!;

    descriptor.value = function(this: any, ...args: any[]) {
      try {
        Timing.start(propertyKey);
        return originalMethod.apply(this, args);
      } finally {
        Timing.end(propertyKey);
      }
    };
  };
}
