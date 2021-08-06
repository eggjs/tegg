import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { EventName } from './EventBus';

export const EVENT_NAME = Symbol.for('EggPrototype#eventName');

export class EventInfoUtil {
  static setEventName(eventName: EventName, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(EVENT_NAME, eventName, clazz);
  }

  static getEventName(clazz: EggProtoImplClass): EventName | undefined {
    return MetadataUtil.getMetaData(EVENT_NAME, clazz);
  }
}
