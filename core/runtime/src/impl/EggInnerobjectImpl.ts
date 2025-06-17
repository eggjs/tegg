import { EggInnerObjectPrototypeImpl, LoadUnitFactory } from '@eggjs/tegg-metadata';
import {
  EggObject,
  EggObjectLifecycle,
  EggObjectLifeCycleContext,
  EggObjectName,
  EggObjectStatus,
  EggPrototype,
  InjectType,
  LifecycleHookName,
  ObjectInfo,
  ObjectInitType,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggObjectLifecycleUtil } from '../model/EggObject';
import { EggContainerFactory } from '../factory/EggContainerFactory';
import { EggObjectUtil } from './EggObjectUtil';
import { ContextHandler } from '../model/ContextHandler';
import { EggObjectFactory } from '../factory/EggObjectFactory';

export default class EggInnerObjectImpl implements EggObject {
  private _obj: object;
  private status: EggObjectStatus = EggObjectStatus.PENDING;

  readonly proto: EggPrototype;
  readonly name: EggObjectName;
  readonly id: string;

  constructor(name: EggObjectName, proto: EggPrototype) {
    this.name = name;
    this.proto = proto;
    const ctx = ContextHandler.getContext();
    this.id = IdenticalUtil.createObjectId(this.proto.id, ctx?.id);
  }

  async initWithInjectProperty(ctx: EggObjectLifeCycleContext) {
    // 1. create obj
    // 2. call obj lifecycle preCreate
    // 3. inject deps
    // 4. call obj lifecycle postCreate
    // 5. success create
    try {
      this._obj = this.proto.constructEggObject();

      // global hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);
      // self hook
      await this.callObjectLifecycle('postConstruct', ctx);

      await this.callObjectLifecycle('preInject', ctx);
      await Promise.all(this.proto.injectObjects.map(async injectObject => {
        const proto = injectObject.proto;
        const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
        if (!loadUnit) {
          throw new Error(`can not find load unit: ${proto.loadUnitId}`);
        }
        if (this.proto.initType !== ObjectInitType.CONTEXT && injectObject.proto.initType === ObjectInitType.CONTEXT) {
          this.injectProperty(injectObject.refName, EggObjectUtil.contextEggObjectGetProperty(proto, injectObject.objName));
        } else {
          const injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
          this.injectProperty(injectObject.refName, EggObjectUtil.eggObjectGetProperty(injectObj));
        }
      }));

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      await this.callObjectLifecycle('postInject', ctx);

      await this.callObjectLifecycle('init', ctx);

      this.status = EggObjectStatus.READY;
    } catch (e) {
      this.status = EggObjectStatus.ERROR;
      throw e;
    }
  }

  async initWithInjectConstructor(ctx: EggObjectLifeCycleContext) {
    // 1. create inject deps
    // 2. create obj
    // 3. call obj lifecycle preCreate
    // 4. call obj lifecycle postCreate
    // 5. success create
    try {
      const constructArgs: any[] = await Promise.all(this.proto.injectObjects!.map(async injectObject => {
        const proto = injectObject.proto;
        const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
        if (!loadUnit) {
          throw new Error(`can not find load unit: ${proto.loadUnitId}`);
        }
        if (this.proto.initType !== ObjectInitType.CONTEXT && injectObject.proto.initType === ObjectInitType.CONTEXT) {
          return EggObjectUtil.contextEggObjectProxy(proto, injectObject.objName);
        }
        const injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
        return EggObjectUtil.eggObjectProxy(injectObj);
      }));
      if (typeof this.proto.multiInstanceConstructorIndex !== 'undefined') {
        const qualifiers = this.proto.multiInstanceConstructorAttributes
          ?.map(t => {
            return {
              attribute: t,
              value: this.proto.getQualifier(t),
            } as QualifierInfo;
          })
          ?.filter(t => typeof t.value !== 'undefined')
          ?? [];
        const objInfo: ObjectInfo = {
          name: this.proto.name,
          qualifiers,
        };
        constructArgs.splice(this.proto.multiInstanceConstructorIndex, 0, objInfo);
      }

      this._obj = this.proto.constructEggObject(...constructArgs);

      // global hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);
      // self hook
      await this.callObjectLifecycle('postConstruct', ctx);

      await this.callObjectLifecycle('preInject', ctx);

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      await this.callObjectLifecycle('postInject', ctx);

      await this.callObjectLifecycle('init', ctx);

      this.status = EggObjectStatus.READY;
    } catch (e) {
      this.status = EggObjectStatus.ERROR;
      throw e;
    }
  }

  async init(ctx: EggObjectLifeCycleContext) {
    if (this.proto.injectType === InjectType.CONSTRUCTOR) {
      await this.initWithInjectConstructor(ctx);
    } else {
      await this.initWithInjectProperty(ctx);
    }
  }

  async destroy(ctx: EggObjectLifeCycleContext) {
    if (this.status === EggObjectStatus.READY) {
      this.status = EggObjectStatus.DESTROYING;
      // global hook
      await EggObjectLifecycleUtil.objectPreDestroy(ctx, this);

      // self hook
      await this.callObjectLifecycle('preDestroy', ctx);

      await this.callObjectLifecycle('destroy', ctx);

      this.status = EggObjectStatus.DESTROYED;
    }
  }

  injectProperty(name: EggObjectName, descriptor: PropertyDescriptor) {
    Reflect.defineProperty(this._obj, name, descriptor);
  }

  get obj() {
    return this._obj;
  }

  get isReady() {
    return this.status === EggObjectStatus.READY;
  }

  private async callObjectLifecycle(hookName: LifecycleHookName, ctx: EggObjectLifeCycleContext) {
    const objLifecycleHook = this._obj as EggObjectLifecycle;
    const lifecycleHook = EggObjectLifecycleUtil.getLifecycleHook(hookName, this.proto);
    if (lifecycleHook) {
      await objLifecycleHook[lifecycleHook]?.(ctx, this);
      return;
    }
  }

  static async createObject(name: EggObjectName, proto: EggPrototype, lifecycleContext: EggObjectLifeCycleContext): Promise<EggInnerObjectImpl> {
    const obj = new EggInnerObjectImpl(name, proto);
    await obj.init(lifecycleContext);
    return obj;
  }
}

EggObjectFactory.registerEggObjectCreateMethod(EggInnerObjectPrototypeImpl, EggInnerObjectImpl.createObject);
