import { EggObject, EggObjectLifeCycleContext, EggObjectLifecycleUtil, EggObjectStatus } from '../model/EggObject';
import { EggPrototype, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { EggObjectName, ObjectInitType } from '@eggjs/core-decorator';
import { EggObjectLifecycle, IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggContainerFactory } from '../factory/EggContainerFactory';
import { EggObjectUtil } from './EggObjectUtil';
import { ContextHandler } from '../model/ContextHandler';

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

  async init(ctx: EggObjectLifeCycleContext) {
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
      if (objLifecycleHook.postConstruct) {
        await objLifecycleHook.postConstruct();
      } else {
        // use decorator style
        await EggObjectLifecycleUtil.callLifecycleHook('postConstruct', objLifecycleHook);
      }

      if (objLifecycleHook.preInject) {
        await objLifecycleHook.preInject();
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
          const injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
          this.injectProperty(injectObject.refName, EggObjectUtil.eggObjectGetProperty(injectObj));
        }
      }));

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      if (objLifecycleHook.postInject) {
        await objLifecycleHook.postInject();
      }

      if (objLifecycleHook.init) {
        await objLifecycleHook.init();
      }

      this.status = EggObjectStatus.READY;
    } catch (e) {
      this.status = EggObjectStatus.ERROR;
      throw e;
    }
  }

  async destroy(ctx: EggObjectLifeCycleContext) {
    if (this.status === EggObjectStatus.READY) {
      this.status = EggObjectStatus.DESTROYING;
      // global hook
      await EggObjectLifecycleUtil.objectPreDestroy(ctx, this);

      // self hook
      const objLifecycleHook = this._obj as EggObjectLifecycle;
      if (objLifecycleHook.preDestroy) {
        await objLifecycleHook.preDestroy();
      }

      if (objLifecycleHook.destroy) {
        await objLifecycleHook.destroy();
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
