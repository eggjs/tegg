import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import { ScheduleOptions, ScheduleParams } from '../decorator/Schedule';

export const IS_SCHEDULE = Symbol.for('EggPrototype#isSchedule');
export const SCHEDULE_PARAMS = Symbol.for('EggPrototype#schedule#params');
export const SCHEDULE_OPTIONS = Symbol.for('EggPrototype#schedule#options');

export class ScheduleInfoUtil {
  static isSchedule(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(IS_SCHEDULE, clazz);
  }

  static setIsSchedule(isSchedule: boolean, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(IS_SCHEDULE, isSchedule, clazz);
  }

  static setScheduleParams<T>(scheduleParams: ScheduleParams<T>, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(SCHEDULE_PARAMS, scheduleParams, clazz);
  }

  static setScheduleOptions(scheduleParams: ScheduleOptions, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(SCHEDULE_OPTIONS, scheduleParams, clazz);
  }

  static getScheduleOptions(clazz: EggProtoImplClass): ScheduleOptions | undefined {
    return MetadataUtil.getMetaData(SCHEDULE_OPTIONS, clazz);
  }

  static getScheduleParams(clazz: EggProtoImplClass): ScheduleParams<object> | undefined {
    return MetadataUtil.getMetaData(SCHEDULE_PARAMS, clazz);
  }
}
