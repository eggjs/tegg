import { MockApplication } from 'egg-mock';
import { Context } from 'egg';
import { TEggPluginContext } from './context';
import { EggContextImpl } from '../../lib/EggContextImpl';
import { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { TEGG_CONTEXT, EGG_CONTEXT } from '@eggjs/egg-module-common';

const TEGG_LIFECYCLE_CACHE: Map<EggContext, EggContextLifecycleContext> = new Map();

export default {
  async mockModuleContext(this: MockApplication, data?: any): Promise<Context> {
    const ctx = this.mockContext(data) as TEggPluginContext;
    const teggCtx = ctx[TEGG_CONTEXT] = new EggContextImpl(ctx);
    ctx[TEGG_CONTEXT] = teggCtx;
    teggCtx.set(EGG_CONTEXT, ctx);
    const lifecycle = {};
    TEGG_LIFECYCLE_CACHE.set(teggCtx, lifecycle);
    if (teggCtx.init) {
      await teggCtx.init(lifecycle);
    }
    return ctx;
  },

  async destroyModuleContext(ctx: Context) {
    const teggPluginCtx = ctx as TEggPluginContext;
    const teggCtx = teggPluginCtx[TEGG_CONTEXT];
    if (!teggCtx) {
      return;
    }
    const lifecycle = TEGG_LIFECYCLE_CACHE.get(teggCtx);
    if (teggCtx.destroy && lifecycle) {
      await teggCtx.destroy(lifecycle);
    }
  },
};
