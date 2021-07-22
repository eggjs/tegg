import {
  LoadUnitInstance,
  LoadUnitInstanceLifecycleContext,
  LoadUnitInstanceLifecycleUtil,
} from '../model/LoadUnitInstance';
import { EggLoadUnitType, EggPrototype, LoadUnit } from '@eggjs/tegg-metadata';
import { EggObjectName, EggPrototypeName, ObjectInitType } from '@eggjs/core-decorator';
import { EggObject } from '../model/EggObject';
import { Id, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggObjectFactory } from '../factory/EggObjectFactory';
import { MapUtil } from '@eggjs/tegg-common-util';
import { LoadUnitInstanceFactory } from '../factory/LoadUnitInstanceFactory';

export class ModuleLoadUnitInstance implements LoadUnitInstance {
  readonly loadUnit: LoadUnit;
  readonly id: string;
  readonly name: string;
  private protoToCreateMap: Map<EggPrototypeName, EggPrototype> = new Map();
  private eggObjectMap: Map<Id, Map<EggPrototypeName, EggObject>> = new Map();
  private eggObjectPromiseMap: Map<Id, Map<EggPrototypeName, Promise<EggObject>>> = new Map();

  constructor(loadUnit: LoadUnit) {
    this.loadUnit = loadUnit;
    this.name = loadUnit.name;
    const iterator = this.loadUnit.iterateEggPrototype();
    for (const proto of iterator) {
      if (proto.initType === ObjectInitType.SINGLETON) {
        this.protoToCreateMap.set(proto.name, proto);
      }
    }
    this.id = IdenticalUtil.createLoadUnitInstanceId(loadUnit.id);
  }

  iterateProtoToCreate(): IterableIterator<[ EggObjectName, EggPrototype ]> {
    return this.protoToCreateMap.entries();
  }

  addProtoToCreate(name: string, proto: EggPrototype) {
    this.protoToCreateMap.set(name, proto);
  }

  deleteProtoToCreate(name: string) {
    this.protoToCreateMap.delete(name);
  }

  async init(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await LoadUnitInstanceLifecycleUtil.objectPreCreate(ctx, this);
    for (const [ name, proto ] of this.protoToCreateMap) {
      await this.getOrCreateEggObject(name, proto);
    }
    await LoadUnitInstanceLifecycleUtil.objectPostCreate(ctx, this);
  }

  async destroy(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await LoadUnitInstanceLifecycleUtil.objectPreDestroy(ctx, this);
    const objs: EggObject[] = Array.from(this.eggObjectMap.values())
      .map(protoObjMap => Array.from(protoObjMap.values()))
      .reduce((p, c) => {
        p = p.concat(c);
        return p;
      }, []);
    this.eggObjectMap.clear();
    await Promise.all(objs.map(async obj => {
      await EggObjectFactory.destroyObject(obj);
    }));
  }

  async getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype): Promise<EggObject> {
    if (!this.loadUnit.containPrototype(proto)) {
      throw new Error('load unit not contain proto');
    }
    const protoObjMap = MapUtil.getOrStore(this.eggObjectMap, proto.id, new Map());
    if (!protoObjMap.has(name)) {
      const protoObjPromiseMap = MapUtil.getOrStore(this.eggObjectPromiseMap, proto.id, new Map());
      if (!protoObjPromiseMap.has(name)) {
        const objPromise = EggObjectFactory.createObject(name, proto);
        protoObjPromiseMap.set(name, objPromise);
        const obj = await objPromise;
        protoObjPromiseMap.delete(name);
        protoObjMap.set(name, obj);
      } else {
        await protoObjPromiseMap.get(name);
      }
    }
    return protoObjMap.get(name)!;
  }

  getEggObject(name: EggPrototypeName, proto: EggPrototype): EggObject {
    const protoObjMap = this.eggObjectMap.get(proto.id);

    if (!protoObjMap || !protoObjMap.has(name)) {
      throw new Error(`EggObject ${String(proto.name)} not found`);
    }
    return protoObjMap.get(name)!;
  }

  static createModuleLoadUnitInstance(ctx: LoadUnitInstanceLifecycleContext): LoadUnitInstance {
    return new ModuleLoadUnitInstance(ctx.loadUnit);
  }
}

LoadUnitInstanceFactory.registerLoadUnitInstanceClass(EggLoadUnitType.MODULE, ModuleLoadUnitInstance.createModuleLoadUnitInstance);
