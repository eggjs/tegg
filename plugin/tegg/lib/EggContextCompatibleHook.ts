import { LifecycleHook, ObjectInitType } from '@eggjs/tegg';
import { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ModuleHandler } from './ModuleHandler';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export class EggContextCompatibleHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private readonly moduleHandler: ModuleHandler;
  private requestProtoList: Array<EggPrototype> = [];

  constructor(moduleHandler: ModuleHandler) {
    this.moduleHandler = moduleHandler;
    for (const loadUnitInstance of this.moduleHandler.loadUnitInstances) {
      const iterator = loadUnitInstance.loadUnit.iterateEggPrototype();
      for (const proto of iterator) {
        if (proto.initType === ObjectInitType.CONTEXT) {
          this.requestProtoList.push(proto);
        }
      }
    }
  }

  async preCreate(_, ctx: EggContext): Promise<void> {
    // root proto added in ctxLifecycleMiddleware
    if (!ctx.get(ROOT_PROTO)) {
      for (const proto of this.requestProtoList) {
        ctx.addProtoToCreate(proto.name, proto);
      }
    }
  }
}
