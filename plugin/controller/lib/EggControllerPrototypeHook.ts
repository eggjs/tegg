import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import {
  ControllerMetaBuilderFactory,
  ControllerMetadataUtil,
  LifecycleHook,
} from '@eggjs/tegg';

export class EggControllerPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(ctx.clazz);
    if (!builder) {
      return;
    }
    const metadata = builder.build();
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(ctx.clazz, metadata);
    }
  }
}
