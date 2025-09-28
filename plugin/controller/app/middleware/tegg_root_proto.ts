import type { Application } from 'egg';
import type { Next, EggContext } from '@eggjs/tegg';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export default function(_: unknown, app: Application) {
  return async function teggRootProto(ctx: EggContext, next: Next) {
    ctx[ROOT_PROTO] = app.rootProtoManager.getRootProto(ctx);
    return next();
  };
}
