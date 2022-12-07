import { AdviceContext, AspectAdvice, IAdvice } from '@eggjs/aop-decorator';
import compose from 'koa-compose';
import type { Middleware } from 'koa-compose';

export class AspectExecutor {
  obj: Object;
  method: PropertyKey;
  aspectAdviceList: readonly AspectAdvice[];

  constructor(obj: object, method: PropertyKey, aspectAdviceList: readonly AspectAdvice[]) {
    this.obj = obj;
    this.method = method;
    this.aspectAdviceList = aspectAdviceList;
  }

  async execute(...args: any[]) {
    const ctx: AdviceContext = {
      that: this.obj,
      method: this.method,
      args,
    };
    await this.beforeCall(ctx);
    try {
      const result = await this.doExecute(ctx);
      await this.afterReturn(ctx, result);
      return result;
    } catch (e) {
      await this.afterThrow(ctx, e);
      throw e;
    } finally {
      await this.afterFinally(ctx);
    }
  }

  async beforeCall(ctx: AdviceContext) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.beforeCall) {
        await advice.beforeCall(ctx);
      }
    }
  }

  async afterReturn(ctx: AdviceContext, result: any) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.afterReturn) {
        await advice.afterReturn(ctx, result);
      }
    }
  }

  async afterThrow(ctx: AdviceContext, error: Error) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.afterThrow) {
        await advice.afterThrow(ctx, error);
      }
    }
  }

  async afterFinally(ctx: AdviceContext) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.afterFinally) {
        await advice.afterFinally(ctx);
      }
    }
  }

  async doExecute(ctx: AdviceContext) {
    const lastCall = () => {
      const originMethod = Object.getPrototypeOf(this.obj)[this.method];
      return Reflect.apply(originMethod, ctx.that, ctx.args);
    };
    const functions: Array<Middleware<AdviceContext>> = [];
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      const fn = advice.around;
      if (fn) {
        functions.push(fn.bind(advice));
      }
    }
    functions.push(lastCall);
    return compose(functions)(ctx);
  }
}
