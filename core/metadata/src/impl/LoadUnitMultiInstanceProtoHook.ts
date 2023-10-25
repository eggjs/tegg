import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import {
  EggPrototypeCreatorFactory, EggPrototypeFactory,
  LoadUnit,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-metadata';

export class LoadUnitMultiInstanceProtoHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  multiInstanceClazzSet: Set<EggProtoImplClass> = new Set();

  async preCreate(ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const clazzList = ctx.loader.load();
    const multiInstanceClazzList = Array.from(this.multiInstanceClazzSet);
    for (const clazz of clazzList) {
      if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
        this.multiInstanceClazzSet.add(clazz);
      }
    }
    for (const clazz of multiInstanceClazzList) {
      const protos = await EggPrototypeCreatorFactory.createProto(clazz, loadUnit);
      for (const proto of protos) {
        EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
      }
    }
  }
}

