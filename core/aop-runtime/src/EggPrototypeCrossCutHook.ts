import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { CrosscutAdviceFactory, CrosscutInfoUtil } from '@eggjs/aop-decorator';
import { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';

export class EggPrototypeCrossCutHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;

  constructor(crosscutAdviceFactory: CrosscutAdviceFactory) {
    this.crosscutAdviceFactory = crosscutAdviceFactory;
  }

  async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    if (CrosscutInfoUtil.isCrosscutAdvice(ctx.clazz)) {
      this.crosscutAdviceFactory.registerCrossAdviceClazz(ctx.clazz);
    }
  }
}
