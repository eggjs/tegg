import { Application } from 'egg';
import { PrototypeUtil, type EventBus, type EventWaiter } from '@eggjs/tegg';
import { SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';
import { type EggPrototype } from '@eggjs/tegg-metadata';

export default {
  async getEventbus(this: Application): Promise<EventBus> {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObject.obj as EventBus;
  },

  async getEventWaiter(this: Application): Promise<EventWaiter> {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObject.obj as EventWaiter;
  },
};

declare module 'egg' {
  interface EggCore {
    getEventbus(): Promise<EventBus>;
    getEventWaiter(): Promise<EventWaiter>;
  }
}
