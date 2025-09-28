import { ROOT_PROTO, TEGG_CONTEXT } from '@eggjs/egg-module-common';
import type { Context } from 'egg';

import { EggContextImpl } from './EggContextImpl.js';

export async function ctxLifecycleMiddleware(ctx: Context, next: () => Promise<void>) {
  // should not recreate teggContext
  if (ctx[TEGG_CONTEXT]) {
    await next();
    return;
  }

  const lifecycle = {};

  const teggCtx = new EggContextImpl(ctx);
  // rootProto is set by tegg-controller-plugin global middleware(teggRootProto)
  // is used in EggControllerHook
  const rootProto = ctx[ROOT_PROTO];
  if (rootProto) {
    teggCtx.set(ROOT_PROTO, rootProto);
  }

  if (teggCtx.init) {
    await teggCtx.init(lifecycle);
  }
  try {
    await next();
  } finally {
    if (teggCtx.destroy) {
      teggCtx.destroy(lifecycle).catch(e => {
        e.message = '[tegg/ctxLifecycleMiddleware] destroy tegg ctx failed:' + e.message;
        ctx.logger.error(e);
      });
    }
  }
}
