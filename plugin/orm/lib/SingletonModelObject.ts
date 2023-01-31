import {
  ContextHandler,
  EggObject,
  EggObjectStatus,
} from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggPrototypeName, EggObjectName } from '@eggjs/tegg';
import { Id, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { Bone } from 'leoric';
import SingletonModelProto from './SingletonModelProto';
import { EGG_CONTEXT } from '@eggjs/egg-module-common';

export class SingletonModelObject implements EggObject {
  private status: EggObjectStatus = EggObjectStatus.PENDING;
  id: Id;
  readonly name: EggPrototypeName;
  private _obj: typeof Bone;
  readonly proto: SingletonModelProto;

  constructor(name: EggObjectName, proto: SingletonModelProto) {
    this.name = name;
    this.proto = proto;
    this.id = IdenticalUtil.createObjectId(this.proto.id);
  }

  private getContext() {
    const ctx = ContextHandler.getContext();
    if (ctx) {
      return ctx.get(EGG_CONTEXT);
    }
  }

  async init() {
    const self = this;
    const clazz = class ContextModelClass extends this.proto.model {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      static get name() {
        return super.name;
      }

      static get ctx() {
        return self.getContext();
      }

      get ctx() {
        return self.getContext();
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

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<SingletonModelObject> {
    const modelObject = new SingletonModelObject(name, proto as SingletonModelProto);
    await modelObject.init();
    return modelObject;
  }
}
