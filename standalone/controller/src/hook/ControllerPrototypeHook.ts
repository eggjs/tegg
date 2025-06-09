import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import {
  ControllerMetaBuilderFactory,
  ControllerMetadataUtil,
  EggPrototypeLifecycleProto,
  LifecycleHook,
} from '@eggjs/tegg';

@EggPrototypeLifecycleProto()
export class ControllerPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const metadata = ControllerMetaBuilderFactory.build(ctx.clazz);
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(ctx.clazz, metadata);
    }
  }
}
