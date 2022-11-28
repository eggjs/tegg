import { Application, EggLogger } from 'egg';
import { PrototypeUtil, EggProtoImplClass } from '@eggjs/tegg';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor';

export class ScheduleSubscriberRegister {
  private readonly agent: Application;
  private readonly logger: EggLogger;

  constructor(agent: Application) {
    this.agent = agent;
    this.logger = this.agent.logger;
  }

  register(clazz: EggProtoImplClass<object>, metadata: ScheduleMetadata<object>) {
    // bind subscriber
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = PrototypeUtil.getFilePath(clazz);
    if (!metadata.disable) this.logger.info('[egg-schedule]: register schedule %s', path);
    (this.agent as any).schedule.registerSchedule({
      schedule,
      key: path,
    });
  }
}
