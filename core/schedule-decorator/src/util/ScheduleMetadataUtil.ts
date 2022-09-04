import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { ScheduleMetadata } from '../model/ScheduleMetadata';

export const SCHEDULE_METADATA = Symbol.for('EggPrototype#schedule#metadata');

export class ScheduleMetadataUtil {
  static setScheduleMetadata(clazz: EggProtoImplClass, metaData: ScheduleMetadata<object>) {
    MetadataUtil.defineMetaData(SCHEDULE_METADATA, metaData, clazz);
  }

  static getScheduleMetadata(clazz): ScheduleMetadata<object> | undefined {
    return MetadataUtil.getMetaData(SCHEDULE_METADATA, clazz);
  }
}
