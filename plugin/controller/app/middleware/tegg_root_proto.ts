import { Application } from 'egg';
import { Next, EggContext } from '@eggjs/tegg';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export default function(_, app: Application) {
  return async function teggRootProto(ctx: EggContext, next: Next) {
    (ctx as any)[ROOT_PROTO] = app.rootProtoManager.getRootProto(ctx);
    return next();
  };
}
