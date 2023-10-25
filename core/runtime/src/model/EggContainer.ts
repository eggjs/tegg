import { LifecycleContext, LifecycleObject } from '@eggjs/tegg-lifecycle';
import { EggObjectName, EggPrototypeName } from '@eggjs/core-decorator';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggObject } from './EggObject';

export interface EggContainer<T extends LifecycleContext> extends LifecycleObject<T> {
  // Call this method in LifecycleHook.preCreate
  // To help container decide which proto should be create
  iterateProtoToCreate(): IterableIterator<[ EggObjectName, EggPrototype ]>;
  addProtoToCreate(name: EggPrototypeName, proto: EggPrototype);
  deleteProtoToCreate(name: EggPrototypeName);

  // async method for get or create object
  getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype): Promise<EggObject>;

  // sync method for get object
  // object should be created before get, or throw Error
  getEggObject(name: EggPrototypeName, proto: EggPrototype): EggObject;
}
