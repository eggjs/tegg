import {
  EggContainerFactory,
  EggContext,
  EggObject,
  EggObjectLifeCycleContext,
  EggObjectFactory as TEggObjectFactory,
} from '@eggjs/tegg-runtime';
import { EggObjectFactoryPrototype } from './EggObjectFactoryPrototype';
import { EggObjectName } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { AbstractEggObjectFactory } from './AbstractEggObjectFactory';

const OBJ = Symbol('EggObjectFactoryObject#obj');

export class EggObjectFactoryObject implements EggObject {
  readonly proto: EggObjectFactoryPrototype;
  readonly name: EggObjectName;
  readonly ctx?: EggContext;
  readonly id: string;
  private [OBJ]: AbstractEggObjectFactory;

  constructor(name: EggObjectName, proto: EggObjectFactoryPrototype, ctx?: EggContext) {
    this.proto = proto;
    this.name = name;
    this.ctx = ctx;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
  }

  get obj() {
    if (!this[OBJ]) {
      this[OBJ] = this.proto.constructEggObject() as AbstractEggObjectFactory;
      this[OBJ].eggContainerFactory = EggContainerFactory;
      this[OBJ].eggContext = this.ctx;
    }
    return this[OBJ];
  }

  static async createObject(name: EggObjectName, proto: EggPrototype, _: EggObjectLifeCycleContext, ctx?: EggContext): Promise<EggObjectFactoryObject> {
    return new EggObjectFactoryObject(name, proto as EggObjectFactoryPrototype, ctx);
  }

  readonly isReady: true;

  injectProperty(): any {
    return;
  }
}

TEggObjectFactory.registerEggObjectCreateMethod(EggObjectFactoryPrototype, EggObjectFactoryObject.createObject);
