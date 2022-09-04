# `@eggjs/tegg-schedule-decorator`

## Install

```shell
npm i --save @eggjs/tegg-schedule-decorator
```

## Define schedule subscriber

```ts
import { Schedule } from '@eggjs/tegg';

// use number to define schedule interval
@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    // run every 100ms
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

// use cron to define schedule interval
@Schedule<CronParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    cron: '0 0 3 * * *',
  },
})
export class FooSubscriber {
  @Inject()
  private readonly logger: EggLogger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
```
