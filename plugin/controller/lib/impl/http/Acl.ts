import { Next, EggContext, HTTPControllerMeta, HTTPMethodMeta } from '@eggjs/tegg';

export function aclMiddlewareFactory(controllerMeta: HTTPControllerMeta, methodMeta: HTTPMethodMeta) {
  if (!controllerMeta.hasMethodAcl(methodMeta)) {
    return;
  }
  const code = controllerMeta.getMethodAcl(methodMeta);
  return async function aclMiddleware(ctx: EggContext, next: Next) {
    try {
      await ctx.acl(code);
    } catch (e) {
      const { redirectUrl, status } = e.data || {};
      if (!redirectUrl) {
        throw e;
      }
      if (ctx.acceptJSON) {
        ctx.body = {
          target: redirectUrl,
          stat: 'deny',
        };
        return;
      }
      if (status) {
        ctx.realStatus = status;
      }
      ctx.redirect(redirectUrl);
      return;

    }
    return next();
  };
}

