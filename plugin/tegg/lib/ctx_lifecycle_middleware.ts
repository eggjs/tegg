import { TEggPluginContext } from '../app/extend/context';
import { EggContextImpl } from './EggContextImpl';
import { ROOT_PROTO, TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { StreamUtil } from '@eggjs/tegg-common-util';
import awaitFirst from 'await-first';

export default async function ctxLifecycleMiddleware(ctx: TEggPluginContext, next) {
  // should not recreate teggContext
  if (ctx[TEGG_CONTEXT]) {
    await next();
    return;
  }

  const lifecycle = {};

  const teggCtx = new EggContextImpl(ctx);
  // rootProto is set by tegg-controller-plugin global middleware(teggRootProto)
  // is used in EggControllerHook
  const rootProto = (ctx as any)[ROOT_PROTO];
  if (rootProto) {
    teggCtx.set(ROOT_PROTO, rootProto);
  }

  if (teggCtx.init) {
    await teggCtx.init(lifecycle);
  }

  async function doDestory() {
    if (StreamUtil.isStream(ctx.response.body)) {
      try {
        await awaitFirst(ctx.response.body, [ 'close', 'error' ]);
      } catch (error) {
        ctx.res.destroy(error);
      }
    }
    try {
      if (teggCtx.destroy) {
        await teggCtx.destroy(lifecycle);
      }
    } catch (e) {
      e.message = '[tegg/ctxLifecycleMiddleware] destroy tegg ctx failed:' + e.message;
      ctx.logger.error(e);
    }
  }
  try {
    await next();
  } finally {
    doDestory();
  }
}
