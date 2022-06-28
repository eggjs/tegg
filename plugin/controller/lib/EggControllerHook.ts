import { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { LifecycleHook } from '@eggjs/tegg';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export class EggControllerHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  async preCreate(_, ctx: EggContext): Promise<void> {
    const rootProto = ctx.get(ROOT_PROTO);
    if (rootProto) {
      const proto: EggPrototype = rootProto;
      ctx.addProtoToCreate(proto.name, proto);
    }
  }
}
