import 'egg';
import '@eggjs/tegg-plugin';
import '@eggjs/tegg-config'
import { EventBus, EventWaiter } from '@eggjs/tegg';

declare module 'egg' {
  interface EventbusApplication {
    getEventbus(): Promise<EventBus>;
    getEventWaiter(): Promise<EventWaiter>;
  }

  interface Application extends EventbusApplication {
  }
}
