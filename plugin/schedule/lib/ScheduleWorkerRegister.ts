import { PrototypeUtil } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';
import { eggScheduleAdapterFactory } from './EggScheduleAdapter';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor';
import { ScheduleManager } from './ScheduleManager';

export class ScheduleWorkerRegister {
  private readonly scheduleManager: ScheduleManager;

  constructor(scheduleManager: ScheduleManager) {
    this.scheduleManager = scheduleManager;
  }

  register(proto: EggPrototype, metadata: ScheduleMetadata<object>) {
    const task = eggScheduleAdapterFactory(proto, metadata);
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const key = proto.getMetaData(PrototypeUtil.FILE_PATH) as string;
    if (!key) {
      throw new Error(`schedule prototype: ${proto.name as string} missing FILE_PATH metadata`);
    }
    this.scheduleManager.register(proto, {
      schedule,
      task,
      key,
    });
  }
}
