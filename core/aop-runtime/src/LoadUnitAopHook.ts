import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { CrosscutAdviceFactory, AspectMetaBuilder, AspectInfoUtil } from '@eggjs/aop-decorator';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { EggPrototype, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';

export interface EggPrototypeWithClazz extends EggPrototype {
  clazz?: EggProtoImplClass;
}

export class LoadUnitAopHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;

  constructor(crosscutAdviceFactory: CrosscutAdviceFactory) {
    this.crosscutAdviceFactory = crosscutAdviceFactory;
  }

  async postCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    for (const proto of loadUnit.iterateEggPrototype()) {
      const protoWithClazz = proto as EggPrototypeWithClazz;
      const clazz = protoWithClazz.clazz;
      if (!clazz) continue;

      const builder = new AspectMetaBuilder(clazz, {
        crosscutAdviceFactory: this.crosscutAdviceFactory,
      });
      const aspectList = builder.build();
      for (const aspect of aspectList) {
        AspectInfoUtil.setAspectList(aspectList, clazz);
        for (const advice of aspect.adviceList) {
          proto.injectObjects.push({
            refName: advice.name,
            objName: advice.name,
            qualifiers: [],
            proto: PrototypeUtil.getClazzProto(advice.clazz) as EggPrototype,
          });
        }
      }
    }
  }
}
