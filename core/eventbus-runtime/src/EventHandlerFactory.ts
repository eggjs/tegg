import { EventHandler, EventName, Events } from '@eggjs/eventbus-decorator';
import { EggContext } from '@eggjs/tegg-runtime';
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

  async getHandlers(event: EventName, ctx: EggContext): Promise<Array<EventHandler<keyof Events>>> {
    const handlerProtos = this.handlerProtoMap.get(event) || [];
    const eggObjs = await Promise.all(handlerProtos.map(proto => {
      return ctx.getOrCreateEggObject(proto.name, proto, ctx);
    }));
    return eggObjs.map(t => t.obj as EventHandler<keyof Events>);
  }
}
