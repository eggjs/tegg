import { type EggPrototype, type EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import {
  ControllerMetaBuilderFactory,
  ControllerMetadataUtil,
  type LifecycleHook,
} from '@eggjs/tegg';

export class EggControllerPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const metadata = ControllerMetaBuilderFactory.build(ctx.clazz);
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(ctx.clazz, metadata);
    }
  }
}
