import { ScheduleTypeLike } from '../model/ScheduleMetadata';
import { AccessLevel, ContextProto, EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { ScheduleInfoUtil } from '../util/ScheduleInfoUtil';
import { StackUtil } from '@eggjs/tegg-common-util';

export interface ScheduleParams<T> {
  type: ScheduleTypeLike;
  scheduleData: T;
}

export interface CronParams {
  cron: string;
  cronOptions?: any;
}

export interface IntervalParams {
  interval: string | number;
}

export type CronScheduleParams = ScheduleParams<CronParams>;
export type IntervalScheduleParams = ScheduleParams<IntervalParams>;

export interface ScheduleOptions {
  // default is false
  immediate?: boolean;
  // default is false
  disable?: boolean;
  // if env has value, only run in this envs
  env?: Array<string>;
}

export interface ScheduleSubscriber {
  subscribe(data?: any): Promise<any>;
}

export function Schedule<T>(param: ScheduleParams<T>, options?: ScheduleOptions) {
  return function(clazz: EggProtoImplClass<ScheduleSubscriber>) {
    ScheduleInfoUtil.setIsSchedule(true, clazz);
    ScheduleInfoUtil.setScheduleParams(param, clazz);
    if (options) {
      ScheduleInfoUtil.setScheduleOptions(options, clazz);
    }
    const func = ContextProto({
      name: clazz.name,
      accessLevel: AccessLevel.PUBLIC,
    });
    func(clazz);

    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 5));
  };
}

