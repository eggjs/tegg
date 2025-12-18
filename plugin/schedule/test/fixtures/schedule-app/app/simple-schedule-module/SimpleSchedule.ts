import {
  IntervalParams,
  Schedule,
  ScheduleType,
} from '@eggjs/tegg-schedule-decorator';

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: 1000,
  },
})
export class SimpleSchedule {
  async subscribe() {
    // do nothing
    console.log('schedule called');
  }
}
