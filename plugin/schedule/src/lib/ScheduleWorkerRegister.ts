import { debuglog } from 'node:util';

import { PrototypeUtil } from '@eggjs/tegg';
import type { EggPrototype } from '@eggjs/tegg-metadata';
import type { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

import { eggScheduleAdapterFactory } from './EggScheduleAdapter.ts';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';
import type { ScheduleManager } from './ScheduleManager.ts';

const debug = debuglog('tegg/plugin/schedule/ScheduleWorkerRegister');

export class ScheduleWorkerRegister {
  private readonly scheduleManager: ScheduleManager;

  constructor(scheduleManager: ScheduleManager) {
    this.scheduleManager = scheduleManager;
  }

  register(proto: EggPrototype, metadata: ScheduleMetadata<object>) {
    const task = eggScheduleAdapterFactory(proto, metadata);
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const key = proto.getMetaData<string>(PrototypeUtil.FILE_PATH);
    if (!key) {
      throw new Error(`schedule prototype: ${proto.name as string} missing FILE_PATH metadata`);
    }
    this.scheduleManager.register(proto, {
      schedule,
      task,
      key,
    });
    debug('register schedule %s, config: %j', key, schedule);
  }
}
