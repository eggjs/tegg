import { LifecycleHook } from '@eggjs/tegg';
import {
  EggLoadUnitType,
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  LoadUnit,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-metadata';
import { Orm } from './SingletonORM';

const REGISTER_CLAZZ = [
  Orm,
];

export class ORMLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async postCreate(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.type === EggLoadUnitType.APP) {
      for (const clazz of REGISTER_CLAZZ) {
        const protos = await EggPrototypeCreatorFactory.createProto(clazz, loadUnit);
        for (const proto of protos) {
          EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
        }
      }
    }
  }
}
