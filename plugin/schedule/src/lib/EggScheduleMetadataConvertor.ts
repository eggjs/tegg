import type { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

export class EggScheduleMetadataConvertor {
  static convertToEggSchedule(metadata: ScheduleMetadata<object>): object {
    return {
      ...metadata.scheduleData,
      type: metadata.type,
      env: metadata.env,
      disable: metadata.disable,
      immediate: metadata.immediate,
    };
  }
}
