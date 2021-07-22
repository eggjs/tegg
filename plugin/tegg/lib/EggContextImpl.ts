import { Context } from 'egg';
import { AbstractEggContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/tegg';
import { EGG_CONTEXT, TEGG_CONTEXT } from '@eggjs/egg-module-common';

export class EggContextImpl extends AbstractEggContext {
  readonly id: string;

  constructor(context: Context) {
    super();
    this.set(EGG_CONTEXT, context);
    (context as any)[TEGG_CONTEXT] = this;
    this.id = IdenticalUtil.createContextId(context.tracer?.traceId);
  }
}
