import { Context } from 'egg';
import { EggContext } from '@eggjs/tegg-runtime';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import ctxLifecycleMiddleware from '../../lib/ctx_lifecycle_middleware';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';

export interface TEggPluginContext extends Context {
  [TEGG_CONTEXT]: EggContext;
}

export default {
  async beginModuleScope(this: TEggPluginContext, func: () => Promise<void>) {
    await ctxLifecycleMiddleware(this, func);
  },

  get teggContext(): EggContext {
    if (!this[TEGG_CONTEXT]) {
      throw new Error('tegg context have not ready, should call after teggCtxLifecycleMiddleware');
    }
    return this[TEGG_CONTEXT];
  },

  async getEggObject(this: Context, clazz: EggProtoImplClass, name?: string) {
    const protoObj = PrototypeUtil.getClazzProto(clazz);
    if (!protoObj) {
      throw new Error(`can not get proto for clazz ${clazz.name}`);
    }
    const proto = protoObj as EggPrototype;
    const eggObject = await this.app.eggContainerFactory.getOrCreateEggObject(proto, name ?? proto.name);
    return eggObject.obj;
  },
};
