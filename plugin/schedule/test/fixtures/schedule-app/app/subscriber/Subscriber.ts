import { Inject } from '@eggjs/tegg';
import { EggLogger } from 'egg';
import {
  IntervalParams,
  Schedule,
  ScheduleType,
} from '@eggjs/tegg-schedule-decorator';

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: 100,
  },
})
export class FooSubscriber {
  @Inject()
  private readonly logger: EggLogger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
