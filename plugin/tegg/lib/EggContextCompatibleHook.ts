import { LifecycleHook, ObjectInitType } from '@eggjs/tegg';
import { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ModuleHandler } from './ModuleHandler';
import { ROOT_PROTO } from '@eggjs/egg-module-common';
import { EggCompatibleProtoImpl } from './EggCompatibleProtoImpl';

export class EggContextCompatibleHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private readonly moduleHandler: ModuleHandler;
  private requestProtoList: Array<EggPrototype> = [];

  constructor(moduleHandler: ModuleHandler) {
    this.moduleHandler = moduleHandler;
    for (const loadUnitInstance of this.moduleHandler.loadUnitInstances) {
      const iterator = loadUnitInstance.loadUnit.iterateEggPrototype();
      for (const proto of iterator) {
        if (proto.initType === ObjectInitType.CONTEXT) {
          // skip the egg compatible object
          // If the egg compatible object has beed used with inject,
          // it will be refer by inject info. And it can not be used
          // with ctx.module.${moduleName} so skip it is safe.
          if (proto instanceof EggCompatibleProtoImpl) continue;
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
