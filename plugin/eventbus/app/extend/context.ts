import { Context } from 'egg';
import { EggContextEventBus } from '../../lib/EggContextEventBus';

const EVENT_BUS = Symbol.for('context#eventBus');

export default {
  get eventBus() {
    if (!this[EVENT_BUS]) {
      this[EVENT_BUS] = new EggContextEventBus(this as unknown as Context);
    }
    return this[EVENT_BUS];
  },
};
