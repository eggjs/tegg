import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import {
  EggPrototypeFactory,
  LoadUnit,
  LoadUnitLifecycleContext,
  EggPrototypeCreatorFactory,
} from '@eggjs/tegg-metadata';
import { EggProtoImplClass } from '@eggjs/tegg';
import { EggObjectFactory } from '@eggjs/tegg-dynamic-inject-runtime';

const INNER_CLASS_LIST = [
  EggObjectFactory,
];

export class LoadUnitInnerClassHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async postCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.type === 'StandaloneLoadUnitType') {
      for (const clazz of INNER_CLASS_LIST) {
        const protos = await EggPrototypeCreatorFactory.createProto(clazz as EggProtoImplClass, loadUnit);
        for (const proto of protos) {
          EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
        }
      }
    }
  }
}
