import { TEggPluginContext } from '../app/extend/context';
import { EggContextImpl } from './EggContextImpl';
import { ROOT_PROTO, TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { StreamUtil } from '@eggjs/tegg-common-util';
import awaitEvent from 'await-event';

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

  function doDestory() {
    teggCtx.destroy(lifecycle).catch(e => {
      e.message = '[tegg/ctxLifecycleMiddleware] destroy tegg ctx failed:' + e.message;
      ctx.logger.error(e);
    });
  }
  try {
    await next();
  } finally {
    if (StreamUtil.isStream(ctx.response.body)) {
      awaitEvent(ctx.response.body, 'close').then(doDestory);
    } else {
      doDestory();
    }
  }
}
