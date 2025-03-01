import { Context } from '@eggjs/core';
import { EggContextEventBus } from '../../lib/EggContextEventBus.js';

const EVENT_BUS = Symbol.for('context#eventBus');

export default class EventBusContext extends Context {
  [EVENT_BUS]: EggContextEventBus;

  get eventBus() {
    if (!this[EVENT_BUS]) {
      this[EVENT_BUS] = new EggContextEventBus(this);
    }
    return this[EVENT_BUS];
  }
}

declare module '@eggjs/core' {
  interface Context {
    get eventBus(): EggContextEventBus;
  }
}
