import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import type {
  EggObject,
  EggObjectLifecycle,
  EggObjectLifeCycleContext,
  EggObjectName,
  EggProtoImplClass,
  EggPrototype, ObjectInfo, QualifierInfo,
} from '@eggjs/tegg-types';
import { EggObjectStatus, InjectType, ObjectInitType } from '@eggjs/tegg-types';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggObjectLifecycleUtil } from '../model/EggObject';
import { EggContainerFactory } from '../factory/EggContainerFactory';
import { EggObjectUtil } from './EggObjectUtil';
import { ContextHandler } from '../model/ContextHandler';
import { FactoryQualifierUtil } from '@eggjs/tegg-dynamic-inject';

export default class EggObjectImpl implements EggObject {
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
      const objLifecycleHook = this._obj as EggObjectLifecycle;

      // global hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);
      // self hook
      const postConstructMethod = EggObjectLifecycleUtil.getLifecycleHook('postConstruct', this.proto) ?? 'postConstruct';
      if (objLifecycleHook[postConstructMethod]) {
        await objLifecycleHook[postConstructMethod](ctx, this);
      }

      const preInjectMethod = EggObjectLifecycleUtil.getLifecycleHook('preInject', this.proto) ?? 'preInject';
      if (objLifecycleHook[preInjectMethod]) {
        await objLifecycleHook[preInjectMethod](ctx, this);
      }
      await Promise.all(this.proto.injectObjects.map(async injectObject => {
        const proto = injectObject.proto;
        const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
        if (!loadUnit) {
          throw new Error(`can not find load unit: ${proto.loadUnitId}`);
        }
        if (this.proto.initType !== ObjectInitType.CONTEXT && injectObject.proto.initType === ObjectInitType.CONTEXT) {
          this.injectProperty(injectObject.refName, EggObjectUtil.contextEggObjectGetProperty(proto, injectObject.objName));
        } else {
          let injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
          if (injectObj.proto.name === 'eggObjectFactory') {
            const dynamics = FactoryQualifierUtil.getProperQualifiers(this._obj.constructor as unknown as EggProtoImplClass, injectObject.refName);
            if (dynamics.length > 0) {
              const obj: any = {
                dynamics,
              };
              const originalGetEggObject = (injectObj.obj as any).getEggObject;
              Object.setPrototypeOf(obj, injectObj.obj);
              obj.getEggObject = function(...args: any[]) {
                if (!this.dynamics.includes(args[0])) {
                  throw new Error(`${args[0].name} is not in dynamic range: ${this.dynamics.map(item => item.name).join(', ')}`);
                }
                return originalGetEggObject.apply(this, args);
              };
              injectObj = Object.create(injectObj);
              Object.defineProperty(injectObj, 'obj', {
                value: obj,
                writable: true,
                enumerable: true,
                configurable: true,
              });
            }
          }
          this.injectProperty(injectObject.refName, EggObjectUtil.eggObjectGetProperty(injectObj));
        }
      }));

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      const postInjectMethod = EggObjectLifecycleUtil.getLifecycleHook('postInject', this.proto) ?? 'postInject';
      if (objLifecycleHook[postInjectMethod]) {
        await objLifecycleHook[postInjectMethod](ctx, this);
      }

      const initMethod = EggObjectLifecycleUtil.getLifecycleHook('init', this.proto) ?? 'init';
      if (objLifecycleHook[initMethod]) {
        await objLifecycleHook[initMethod](ctx, this);
      }

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
      const objLifecycleHook = this._obj as EggObjectLifecycle;

      // global hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);
      // self hook
      const postConstructMethod = EggObjectLifecycleUtil.getLifecycleHook('postConstruct', this.proto) ?? 'postConstruct';
      if (objLifecycleHook[postConstructMethod]) {
        await objLifecycleHook[postConstructMethod](ctx, this);
      }

      const preInjectMethod = EggObjectLifecycleUtil.getLifecycleHook('preInject', this.proto) ?? 'preInject';
      if (objLifecycleHook[preInjectMethod]) {
        await objLifecycleHook[preInjectMethod](ctx, this);
      }

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      const postInjectMethod = EggObjectLifecycleUtil.getLifecycleHook('postInject', this.proto) ?? 'postInject';
      if (objLifecycleHook[postInjectMethod]) {
        await objLifecycleHook[postInjectMethod](ctx, this);
      }

      const initMethod = EggObjectLifecycleUtil.getLifecycleHook('init', this.proto) ?? 'init';
      if (objLifecycleHook[initMethod]) {
        await objLifecycleHook[initMethod](ctx, this);
      }

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
      const objLifecycleHook = this._obj as EggObjectLifecycle;
      const preDestroyMethod = EggObjectLifecycleUtil.getLifecycleHook('preDestroy', this.proto) ?? 'preDestroy';
      if (objLifecycleHook[preDestroyMethod]) {
        await objLifecycleHook[preDestroyMethod](ctx, this);
      }

      const destroyMethod = EggObjectLifecycleUtil.getLifecycleHook('destroy', this.proto) ?? 'destroy';
      if (objLifecycleHook[destroyMethod]) {
        await objLifecycleHook[destroyMethod](ctx, this);
      }

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

  static async createObject(name: EggObjectName, proto: EggPrototype, lifecycleContext: EggObjectLifeCycleContext): Promise<EggObjectImpl> {
    const obj = new EggObjectImpl(name, proto);
    await obj.init(lifecycleContext);
    return obj;
  }
}
