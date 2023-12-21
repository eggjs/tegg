import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { EventName } from './EventBus';

export const EVENT_NAME = Symbol.for('EggPrototype#eventName');

export class EventInfoUtil {
  static addEventName(eventName: EventName, clazz: EggProtoImplClass) {
    const eventNameList = MetadataUtil.initOwnArrayMetaData<EventName>(EVENT_NAME, clazz, []);
    eventNameList.push(eventName);
  }

  static getEventNameList(clazz: EggProtoImplClass): EventName[] {
    return MetadataUtil.getArrayMetaData(EVENT_NAME, clazz);
  }
}
