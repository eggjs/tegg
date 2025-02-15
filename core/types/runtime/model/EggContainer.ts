import { EggObjectName, EggPrototypeName } from '../../core-decorator';
import { LifecycleContext, LifecycleObject } from '../../lifecycle';
import { EggPrototype } from '../../metadata';
import { EggObject } from './EggObject';

export interface EggContainer<T extends LifecycleContext> extends LifecycleObject<T> {
  // Call this method in LifecycleHook.preCreate
  // To help container decide which proto should be create
  iterateProtoToCreate(): IterableIterator<[ EggObjectName, EggPrototype ]>;
  addProtoToCreate(name: EggPrototypeName, proto: EggPrototype): void;
  deleteProtoToCreate(name: EggPrototypeName): void;

  // async method for get or create object
  getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype): Promise<EggObject>;

  // sync method for get object
  // object should be created before get, or throw Error
  getEggObject(name: EggPrototypeName, proto: EggPrototype): EggObject;
}
