import { EggObject, EggObjectLifeCycleContext } from '../model/EggObject';
import { EggObjectName } from '@eggjs/core-decorator';
import { EggPrototype, EggPrototypeClass, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { EggContext } from '../model/EggContext';
import EggObjectImpl from '../impl/EggObjectImpl';
import { LoadUnitInstanceFactory } from './LoadUnitInstanceFactory';

interface EggObjectPair {
  obj: EggObject;
  ctx: EggObjectLifeCycleContext;
}

export type CreateObjectMethod = (name: EggObjectName, proto: EggPrototype, lifecycleContext: EggObjectLifeCycleContext, ctx?: EggContext) => Promise<EggObject>;

export class EggObjectFactory {
  static eggObjectMap: Map<string, EggObjectPair> = new Map();
  static eggObjectCreateMap: Map<EggPrototypeClass, CreateObjectMethod> = new Map();

  public static registerEggObjectCreateMethod(protoClass: EggPrototypeClass, method: CreateObjectMethod) {
    this.eggObjectCreateMap.set(protoClass, method);
  }

  public static getEggObjectCreateMethod(protoClass: EggPrototypeClass): CreateObjectMethod {
    if (this.eggObjectCreateMap.has(protoClass)) {
      return this.eggObjectCreateMap.get(protoClass)!;
    }
    return EggObjectImpl.createObject;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype, ctx?: EggContext): Promise<EggObject> {
    const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
    if (!loadUnit) {
      throw new Error(`not found load unit ${proto.loadUnitId}`);
    }
    const loadUnitInstance = LoadUnitInstanceFactory.getLoadUnitInstance(loadUnit);
    const lifecycleContext: EggObjectLifeCycleContext = {
      loadUnit,
      loadUnitInstance: loadUnitInstance!,
    };
    const method = this.getEggObjectCreateMethod(proto.constructor as EggPrototypeClass);
    const args = [ name, proto, lifecycleContext, ctx ];
    const obj = await Reflect.apply(method, null, args);
    this.eggObjectMap.set(obj.id, { obj, ctx: lifecycleContext });
    return obj;
  }

  static async destroyObject(obj: EggObject): Promise<void> {
    const { ctx } = this.eggObjectMap.get(obj.id)!;
    try {
      if (obj.destroy) {
        await obj.destroy(ctx);
      }
    } finally {
      this.eggObjectMap.delete(obj.id);
    }
  }
}
