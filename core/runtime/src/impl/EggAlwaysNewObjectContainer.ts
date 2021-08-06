import { EggContainer } from '../model/EggContainer';
import { Id, LifecycleContext } from '@eggjs/tegg-lifecycle';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggObjectName, ObjectInitType } from '@eggjs/core-decorator';
import { EggObject } from '../model/EggObject';
import { EggContext } from '../model/EggContext';
import { EggObjectFactory } from '../factory/EggObjectFactory';
import { EggContainerFactory } from '../factory/EggContainerFactory';

export class EggAlwaysNewObjectContainer implements EggContainer<LifecycleContext> {
  static instance = new EggAlwaysNewObjectContainer();
  readonly id: Id;

  constructor() {
    this.id = 'ALWAYS_NEW_OBJECT_CONTAINER';
  }

  addProtoToCreate() {
    return;
  }

  deleteProtoToCreate() {
    return;
  }

  iterateProtoToCreate(): IterableIterator<[ EggObjectName, EggPrototype ]> {
    return new Map().entries();
  }

  getEggObject(): EggObject {
    throw new Error('Always Object can not use getEggObject, should use getOrCreateEggObject');
  }

  async getOrCreateEggObject(name: string, proto: EggPrototype, ctx?: EggContext): Promise<EggObject> {
    return EggObjectFactory.createObject(name, proto, ctx);
  }

  async destroy(): Promise<void> {
    // do nothing
  }

  async init(): Promise<void> {
    // do nothing
  }
}

EggContainerFactory.registerContainerGetMethod(ObjectInitType.ALWAYS_NEW, () => EggAlwaysNewObjectContainer.instance);
