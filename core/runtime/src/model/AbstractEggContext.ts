import { EggContext, EggContextLifecycleContext, EggContextLifecycleUtil } from './EggContext';
import { EggObjectName, EggPrototypeName, ObjectInitType } from '@eggjs/core-decorator';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggObject } from './EggObject';
import { Id } from '@eggjs/tegg-lifecycle';
import { MapUtil } from '@eggjs/tegg-common-util';
import { EggContainerFactory } from '../factory/EggContainerFactory';
import { EggObjectFactory } from '../factory/EggObjectFactory';

export abstract class AbstractEggContext implements EggContext {
  private contextData: Map<string | symbol, any> = new Map();
  private protoToCreate: Map<EggPrototypeName, EggPrototype> = new Map();
  private eggObjectMap: Map<Id, Map<EggPrototypeName, EggObject>> = new Map();
  private eggObjectPromiseMap: Map<Id, Map<EggPrototypeName, Promise<EggObject>>> = new Map();

  abstract id: string;

  addProtoToCreate(name: string, proto: EggPrototype) {
    this.protoToCreate.set(name, proto);
  }

  deleteProtoToCreate(name) {
    this.protoToCreate.delete(name);
  }

  async destroy(ctx: EggContextLifecycleContext): Promise<void> {
    await EggContextLifecycleUtil.objectPreDestroy(ctx, this);
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
    this.contextData.clear();
  }

  get(key: string | symbol): any | undefined {
    return this.contextData.get(key);
  }

  getEggObject(name: EggPrototypeName, proto: EggPrototype): EggObject {
    const protoObjMap = this.eggObjectMap.get(proto.id);

    if (!protoObjMap || !protoObjMap.has(name)) {
      throw new Error(`EggObject ${String(proto.name)} not found`);
    }
    return protoObjMap.get(name)!;
  }

  async getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype, ctx?: EggContext): Promise<EggObject> {
    const protoObjMap = MapUtil.getOrStore(this.eggObjectMap, proto.id, new Map());
    if (!protoObjMap.has(name)) {
      const protoObjPromiseMap = MapUtil.getOrStore(this.eggObjectPromiseMap, proto.id, new Map());
      if (!protoObjPromiseMap.has(name)) {
        const objPromise = EggObjectFactory.createObject(name, proto, ctx);
        protoObjPromiseMap.set(name, objPromise);
        const obj = await objPromise;
        protoObjPromiseMap.delete(name);
        if (!protoObjPromiseMap.size) {
          this.eggObjectPromiseMap.delete(proto.id);
        }
        protoObjMap.set(name, obj);
      } else {
        await protoObjPromiseMap.get(name);
      }
    }
    return protoObjMap.get(name)!;
  }

  async init(ctx: EggContextLifecycleContext): Promise<void> {
    await EggContextLifecycleUtil.objectPreCreate(ctx, this);
    for (const [ name, proto ] of this.protoToCreate) {
      await this.getOrCreateEggObject(name, proto, this);
    }
    await EggContextLifecycleUtil.objectPostCreate(ctx, this);
  }

  iterateProtoToCreate(): IterableIterator<[ EggObjectName, EggPrototype ]> {
    return this.protoToCreate.entries();
  }

  set(key: string | symbol, val: any) {
    this.contextData.set(key, val);
  }
}

EggContainerFactory.registerContainerGetMethod(ObjectInitType.CONTEXT, (_: EggPrototype, ctx?: EggContext) => {
  if (!ctx) {
    throw new Error('ctx is required');
  }
  return ctx;
});
