import { LifecycleHook, EVENT_NAME } from '@eggjs/tegg';
import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import { EventHandlerProtoManager } from './EventHandlerProtoManager.js';

export class EventbusProtoHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private eventHandlerProtoManager: EventHandlerProtoManager;

  constructor(eventHandlerProtoManager: EventHandlerProtoManager) {
    this.eventHandlerProtoManager = eventHandlerProtoManager;
  }

  async postCreate(_ctx: EggPrototypeLifecycleContext, obj: EggPrototype): Promise<void> {
    const event = obj.getMetaData(EVENT_NAME);
    if (!event) {
      return;
    }
    this.eventHandlerProtoManager.addProto(obj);
  }
}
