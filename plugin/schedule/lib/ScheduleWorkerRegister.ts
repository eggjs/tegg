import { EggCore as Application } from '@eggjs/core';
import { PrototypeUtil } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';
import { eggScheduleAdapterFactory } from './EggScheduleAdapter.js';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.js';

export class ScheduleWorkerRegister {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  register(proto: EggPrototype, metadata: ScheduleMetadata<object>) {
    const task = eggScheduleAdapterFactory(proto, metadata);
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = proto.getMetaData(PrototypeUtil.FILE_PATH);
    (this.app as any).scheduleWorker.registerSchedule({
      schedule,
      task,
      key: path,
    });
  }
}
