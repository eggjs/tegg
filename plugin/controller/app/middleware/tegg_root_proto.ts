import type { EggCore } from '@eggjs/core';
import type { Next, EggContext } from '@eggjs/tegg';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export default function(_: unknown, app: EggCore) {
  return async function teggRootProto(ctx: EggContext, next: Next) {
    ctx[ROOT_PROTO] = app.rootProtoManager.getRootProto(ctx);
    return next();
  };
}
