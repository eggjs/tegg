import { MockApplication } from 'egg-mock';
import { Context } from 'egg';
import { EggContextImpl } from '../../lib/EggContextImpl';
import { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';

const TEGG_LIFECYCLE_CACHE: Map<EggContext, EggContextLifecycleContext> = new Map();

let hasMockModuleContext = false;

export default {
  async mockModuleContext(this: MockApplication, data?: any): Promise<Context> {
    this.deprecate('app.mockModuleContext is deprecated, use mockModuleContextScope.');
    if (hasMockModuleContext) {
      throw new Error('should not call mockModuleContext twice.');
    }
    const ctx = this.mockContext(data);
    const teggCtx = new EggContextImpl(ctx);
    const lifecycle = {};
    TEGG_LIFECYCLE_CACHE.set(teggCtx, lifecycle);
    if (teggCtx.init) {
      await teggCtx.init(lifecycle);
    }
    hasMockModuleContext = true;
    return ctx;
  },

  async destroyModuleContext(ctx: Context) {
    hasMockModuleContext = false;

    const teggCtx = ctx.teggContext;
    if (!teggCtx) {
      return;
    }
    const lifecycle = TEGG_LIFECYCLE_CACHE.get(teggCtx);
    if (teggCtx.destroy && lifecycle) {
      await teggCtx.destroy(lifecycle);
    }
  },

  async mockModuleContextScope<R=any>(this: MockApplication, fn: (ctx: Context) => Promise<R>, data?: any): Promise<R> {
    if (hasMockModuleContext) {
      throw new Error('mockModuleContextScope can not use with mockModuleContext, should use mockModuleContextScope only.');
    }
    return this.mockContextScope(async ctx => {
      const teggCtx = new EggContextImpl(ctx);
      const lifecycle = {};
      if (teggCtx.init) {
        await teggCtx.init(lifecycle);
      }
      try {
        return await fn(ctx);
      } finally {
        await teggCtx.destroy(lifecycle);
      }
    }, data);
  },
};
