import { LifecycleHook, ObjectInitType } from '@eggjs/tegg';
import { EggContainerFactory, EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ModuleHandler } from './ModuleHandler';
import { ROOT_PROTO } from '@eggjs/egg-module-common';
import { EggCompatibleProtoImpl } from './EggCompatibleProtoImpl';

export class EggContextCompatibleHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private readonly moduleHandler: ModuleHandler;
  private requestProtoList: Array<EggPrototype> = [];
  private initProtoList: Array<EggPrototype> = [];

  constructor(moduleHandler: ModuleHandler) {
    this.moduleHandler = moduleHandler;
    for (const loadUnitInstance of this.moduleHandler.loadUnitInstances) {
      const iterator = loadUnitInstance.loadUnit.iterateEggPrototype();
      for (const proto of iterator) {
        // skip the egg compatible object
        // If the egg compatible object has beed used with inject,
        // it will be refer by inject info. And it can not be used
        // with ctx.module.${moduleName} so skip it is safe.
        if (proto instanceof EggCompatibleProtoImpl) continue;
        if (proto.initType === ObjectInitType.CONTEXT) {
          this.requestProtoList.push(proto);
        } else if (proto.initType === ObjectInitType.SINGLETON) {
          this.initProtoList.push(proto);
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
      await Promise.all(this.initProtoList.map(async proto => {
        await EggContainerFactory.getOrCreateEggObject(proto);
      }));
    }
  }
}
