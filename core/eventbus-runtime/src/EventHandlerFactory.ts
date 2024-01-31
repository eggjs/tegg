import { EventHandler, EventName, Events, Arguments, EVENT_CONTEXT_INJECT } from '@eggjs/eventbus-decorator';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import { AccessLevel, SingletonProto } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class EventHandlerFactory {
  private handlerProtoMap: Map<EventName, Array<EggPrototype>> = new Map();

  registerHandler(event: EventName, proto: EggPrototype) {
    const protos = MapUtil.getOrStore(this.handlerProtoMap, event, []);
    protos.push(proto);
  }

  hasListeners(event: EventName) {
    return this.handlerProtoMap.has(event);
  }

  getHandlerProtos(event: EventName): Array<EggPrototype> {
    const handlerProtos = this.handlerProtoMap.get(event) || [];
    return handlerProtos;
  }

  async getHandler(proto: EggPrototype): Promise<EventHandler<keyof Events>> {
    const eggObj = await EggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObj.obj as EventHandler<keyof Events>;
  }

  async getHandlers(event: EventName): Promise<Array<EventHandler<keyof Events>>> {
    const handlerProtos = this.getHandlerProtos(event);
    return await Promise.all(handlerProtos.map(proto => {
      return this.getHandler(proto);
    }));
  }

  async handle(eventName: EventName, proto: EggPrototype, args: Arguments<any>): Promise<void> {
    const handler = await this.getHandler(proto);
    const enableInjectCtx = proto.getMetaData<boolean>(EVENT_CONTEXT_INJECT) ?? false;
    if (enableInjectCtx) {
      const ctx = {
        eventName,
      };
      await Reflect.apply(handler.handle, handler, [ ctx, ...args ]);
    } else {
      await Reflect.apply(handler.handle, handler, args);
    }
  }
}
