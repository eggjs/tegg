import { Application } from 'egg';
import { PrototypeUtil } from '@eggjs/tegg';
import { type EggPrototype } from '@eggjs/tegg-metadata';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

import { eggScheduleAdapterFactory } from './EggScheduleAdapter.ts';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';

export class ScheduleWorkerRegister {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  register(proto: EggPrototype, metadata: ScheduleMetadata<object>) {
    const task = eggScheduleAdapterFactory(proto, metadata);
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = proto.getMetaData(PrototypeUtil.FILE_PATH);
    // @ts-expect-error app scheduleWorker is not typed
    this.app.scheduleWorker.registerSchedule({
      schedule,
      task,
      key: path,
    });
  }
}
