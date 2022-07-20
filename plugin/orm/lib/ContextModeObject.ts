import assert from 'assert';
import {
  EggContext,
  EggObject,
  EggObjectLifeCycleContext,
  EggObjectStatus,
} from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggPrototypeName, EggObjectName } from '@eggjs/tegg';
import { Id, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { Bone } from 'leoric';
import ContextModelProto from './ContextModelProto';
import { EGG_CONTEXT } from '@eggjs/egg-module-common';

export class ContextModeObject implements EggObject {
  private status: EggObjectStatus = EggObjectStatus.PENDING;
  id: Id;
  readonly name: EggPrototypeName;
  private _obj: typeof Bone;
  readonly proto: ContextModelProto;
  readonly ctx: EggContext;

  constructor(name: EggObjectName, proto: ContextModelProto, ctx: EggContext) {
    this.name = name;
    this.proto = proto;
    this.ctx = ctx;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx.id);
  }

  async init() {
    const ctx = this.ctx;
    const clazz = class ContextModelClass extends this.proto.model {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      static get name() {
        return super.name;
      }

      static get ctx() {
        return ctx.get(EGG_CONTEXT);
      }

      // custom setter always execute before define [CTX] when new Instance(super(opts) calling), if custom setter requires ctx, it should not be undefined
      get ctx() {
        return ctx.get(EGG_CONTEXT);
      }
    };
    this._obj = clazz;
    this.status = EggObjectStatus.READY;
  }

  injectProperty() {
    throw new Error('never call ModelObject#injectProperty');
  }

  get isReady() {
    return this.status === EggObjectStatus.READY;
  }

  get obj() {
    return this._obj;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype, _: EggObjectLifeCycleContext, ctx?: EggContext): Promise<ContextModeObject> {
    assert(ctx, 'ctx must be defined for ContextModelObject');
    const modelObject = new ContextModeObject(name, proto as ContextModelProto, ctx);
    await modelObject.init();
    return modelObject;
  }
}
