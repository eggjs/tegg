import { EggCore as Application } from '@eggjs/core';
import { PrototypeUtil, EggProtoImplClass } from '@eggjs/tegg';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.js';

export class ScheduleSubscriberRegister {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  register(clazz: EggProtoImplClass<object>, metadata: ScheduleMetadata<object>) {
    // bind subscriber
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = PrototypeUtil.getFilePath(clazz);
    if (!metadata.disable) {
      this.agent.logger.info('[@eggjs/tegg-schedule-plugin]: register schedule %s', path);
    }
    (this.agent as any).schedule.registerSchedule({
      schedule,
      key: path,
    });
  }
}
