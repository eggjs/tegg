import { TEggPluginContext } from '../app/extend/context';
import { EggContextImpl } from './EggContextImpl';
import { ROOT_PROTO, TEGG_CONTEXT } from '@eggjs/egg-module-common';

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
