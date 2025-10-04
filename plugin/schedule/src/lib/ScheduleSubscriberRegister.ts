import { type EggApplicationCore } from 'egg';
import { PrototypeUtil, type EggProtoImplClass } from '@eggjs/tegg';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';

export class ScheduleSubscriberRegister {
  private readonly agent: EggApplicationCore;

  constructor(agent: EggApplicationCore) {
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
