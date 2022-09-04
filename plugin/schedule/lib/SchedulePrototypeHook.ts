import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import { ScheduleMetaBuilder } from '@eggjs/tegg-schedule-decorator/src/builder/ScheduleMetaBuilder';
import { ScheduleInfoUtil, ScheduleMetadataUtil } from '@eggjs/tegg-schedule-decorator';

export class SchedulePrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    if (!ScheduleInfoUtil.isSchedule(ctx.clazz)) {
      return;
    }
    const builder = new ScheduleMetaBuilder(ctx.clazz);
    const metadata = builder.build();
    if (metadata) {
      ScheduleMetadataUtil.setScheduleMetadata(ctx.clazz, metadata);
    }
  }
}
