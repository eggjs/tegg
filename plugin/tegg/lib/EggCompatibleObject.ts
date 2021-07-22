import { EggCompatibleProtoImpl } from './EggCompatibleProtoImpl';
import { EggContext, EggObject, EggObjectFactory, EggObjectLifeCycleContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil, EggObjectName } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';

const OBJ = Symbol('EggCompatibleObject#obj');

export class EggCompatibleObject implements EggObject {
  readonly isReady: boolean = true;
  private [OBJ]: object;
  readonly proto: EggCompatibleProtoImpl;
  readonly name: EggObjectName;
  readonly ctx?: EggContext;
  readonly id: string;

  constructor(name: EggObjectName, proto: EggCompatibleProtoImpl, ctx?: EggContext) {
    this.proto = proto;
    this.name = name;
    this.ctx = ctx;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
  }

  // If the egg object is a getter,
  // access may have side effect.
  // So access egg object lazy.
  get obj() {
    if (!this[OBJ]) {
      this[OBJ] = this.proto.constructorEggCompatibleObject(this.ctx);
    }
    return this[OBJ];
  }

  injectProperty() {
    return;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype, _: EggObjectLifeCycleContext, ctx?: EggContext): Promise<EggCompatibleObject> {
    return new EggCompatibleObject(name, proto as EggCompatibleProtoImpl, ctx);
  }
}

EggObjectFactory.registerEggObjectCreateMethod(EggCompatibleProtoImpl, EggCompatibleObject.createObject);
