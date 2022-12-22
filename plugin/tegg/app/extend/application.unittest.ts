import mm, { MockApplication } from 'egg-mock';
import { Context } from 'egg';
import { EggContextImpl } from '../../lib/EggContextImpl';
import { ContextHandler, EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { TEggPluginContext } from './context';

const TEGG_LIFECYCLE_CACHE: Map<EggContext, EggContextLifecycleContext> = new Map();

let hasMockModuleContext = false;

export default {
  async mockModuleContext(this: MockApplication, data?: any): Promise<Context> {
    if (hasMockModuleContext) {
      throw new Error('should not call mockModuleContext twice, should use mockModuleContextScope.');
    }
    const ctx = this.mockContext(data) as TEggPluginContext;
    const teggCtx = new EggContextImpl(ctx);
    mm(ContextHandler, 'getContext', () => {
      return teggCtx;
    });
    const lifecycle = {};
    TEGG_LIFECYCLE_CACHE.set(teggCtx, lifecycle);
    if (teggCtx.init) {
      await teggCtx.init(lifecycle);
    }
    return ctx;
  },

  async destroyModuleContext(ctx: Context) {
    hasMockModuleContext = false;

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

  async moduleModuleContextScope<R=any>(this: MockApplication, fn: (ctx: Context) => Promise<R>, data?: any): Promise<R> {
    if (hasMockModuleContext) {
      throw new Error('mockModuleContextScope can not use with mockModuleContext, should use mockModuleContextScope only.');
    }
    const ctx = this.mockContext(data);
    const teggCtx = new EggContextImpl(ctx);
    return await ContextHandler.run<R>(teggCtx, async () => {
      const lifecycle = {};
      if (teggCtx.init) {
        await teggCtx.init(lifecycle);
      }
      try {
        return await fn(ctx);
      } finally {
        await teggCtx.destroy(lifecycle);
      }
    });
  },
};
