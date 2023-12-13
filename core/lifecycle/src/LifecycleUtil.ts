import { EggProtoImplClass, MetadataUtil } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/tegg-metadata';
import { LifecycleContext, LifecycleHook, LifecycleObject } from './LifecycleHook';
import { EggObjectLifecycle } from './EggObjectLifecycle';

export type LifecycleHookName = keyof EggObjectLifecycle;

export class LifecycleUtil<T extends LifecycleContext, R extends LifecycleObject<T>> {

  private lifecycleSet: Set<LifecycleHook<T, R>> = new Set();
  private objLifecycleSet: Map<string, Set<LifecycleHook<T, R>>> = new Map();

  registerLifecycle(lifecycle: LifecycleHook<T, R>) {
    this.lifecycleSet.add(lifecycle);
  }

  deleteLifecycle(lifecycle: LifecycleHook<T, R>) {
    this.lifecycleSet.delete(lifecycle);
  }

  getLifecycleList(): LifecycleHook<T, R>[] {
    return Array.from(this.lifecycleSet);
  }

  registerObjectLifecycle(obj: R, lifecycle: LifecycleHook<T, R>) {
    if (!this.objLifecycleSet.has(obj.id)) {
      this.objLifecycleSet.set(obj.id, new Set());
    }
    this.objLifecycleSet.get(obj.id)!.add(lifecycle);
  }

  deleteObjectLifecycle(obj: R, lifecycle: LifecycleHook<T, R>) {
    this.objLifecycleSet.get(obj.id)?.delete(lifecycle);
  }

  clearObjectLifecycle(obj: R) {
    this.objLifecycleSet.delete(obj.id);
  }

  getObjectLifecycleList(obj: R): LifecycleHook<T, R>[] {
    if (this.objLifecycleSet.has(obj.id)) {
      return Array.from(this.objLifecycleSet.get(obj.id)!);
    }
    return [];
  }

  async objectPreCreate(ctx: T, obj: R) {
    const globalLifecycleList = this.getLifecycleList();
    const objLifecycleList = this.getObjectLifecycleList(obj);
    await Promise.all(globalLifecycleList.map(lifecycle => LifecycleUtil.callPreCreate(lifecycle, ctx, obj)));
    await Promise.all(objLifecycleList.map(lifecycle => LifecycleUtil.callPreCreate(lifecycle, ctx, obj)));
  }

  async objectPostCreate(ctx: T, obj: R) {
    const lifecycleList = this.getLifecycleList();
    const objLifecycleList = this.getObjectLifecycleList(obj);
    await Promise.all(lifecycleList.map(lifecycle => LifecycleUtil.callPostCreate(lifecycle, ctx, obj)));
    await Promise.all(objLifecycleList.map(lifecycle => LifecycleUtil.callPostCreate(lifecycle, ctx, obj)));
  }

  async objectPreDestroy(ctx: T, obj: R) {
    const lifecycleList = this.getLifecycleList();
    const objLifecycleList = this.getObjectLifecycleList(obj);
    await Promise.all(lifecycleList.map(lifecycle => LifecycleUtil.callPreDestroy(lifecycle, ctx, obj)));
    await Promise.all(objLifecycleList.map(lifecycle => LifecycleUtil.callPreDestroy(lifecycle, ctx, obj)));
  }

  static async callPreCreate<T extends LifecycleContext, R extends LifecycleObject<T>>(lifecycle: LifecycleHook<T, R> | undefined, ctx: T, obj: R) {
    if (!lifecycle || !lifecycle.preCreate) {
      return;
    }
    await lifecycle.preCreate(ctx, obj);
  }

  static async callPostCreate<T extends LifecycleContext, R extends LifecycleObject<T>>(lifecycle: LifecycleHook<T, R> | undefined, ctx: T, obj: R) {
    if (!lifecycle || !lifecycle.postCreate) {
      return;
    }
    await lifecycle.postCreate(ctx, obj);
  }

  static async callPreDestroy<T extends LifecycleContext, R extends LifecycleObject<T>>(lifecycle: LifecycleHook<T, R> | undefined, ctx: T, obj: R) {
    if (!lifecycle || !lifecycle.preDestroy) {
      return;
    }
    await lifecycle.preDestroy(ctx, obj);
  }

  static setLifecycleHook(method: string, hookName: LifecycleHookName, clazz: EggProtoImplClass) {
    const LIFECYCLE_HOOK = Symbol.for(`EggPrototype#Lifecycle${hookName}`);
    MetadataUtil.defineMetaData(LIFECYCLE_HOOK, method, clazz);
  }

  getLifecycleHook(hookName: LifecycleHookName, proto: EggPrototype) {
    const LIFECYCLE_HOOK = Symbol.for(`EggPrototype#Lifecycle${hookName}`);
    return proto.getMetaData<string>(LIFECYCLE_HOOK);
  }
}
