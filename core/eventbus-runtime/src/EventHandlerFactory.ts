import { EventHandler, EventName, Events } from '@eggjs/eventbus-decorator';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import { AccessLevel, SingletonProto } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class EventHandlerFactory {
  private handlerProtoMap: Map<EventName, Array<EggPrototype>> = new Map();

  registerHandler(events: EventName[], proto: EggPrototype) {
    for (const event of events) {
      const protos = MapUtil.getOrStore(this.handlerProtoMap, event, []);
      protos.push(proto);
    }
  }

  hasListeners(event: EventName) {
    return this.handlerProtoMap.has(event);
  }

  async getHandlers(event: EventName): Promise<Array<EventHandler<keyof Events>>> {
    const handlerProtos = this.handlerProtoMap.get(event) || [];
    const eggObjs = await Promise.all(handlerProtos.map(proto => {
      return EggContainerFactory.getOrCreateEggObject(proto, proto.name);
    }));
    return eggObjs.map(t => t.obj as EventHandler<keyof Events>);
  }
}
