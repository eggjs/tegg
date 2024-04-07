import type { AdviceContext, AspectAdvice, IAdvice } from '@eggjs/tegg-types';
import compose from 'koa-compose';
import type { Middleware } from 'koa-compose';

interface InternalAdviceContext<T = object> {
  that: T;
  method: PropertyKey;
  args: any[];
}

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
    const ctx: InternalAdviceContext = {
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

  async beforeCall(ctx: InternalAdviceContext) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.beforeCall) {
        /**
         * 这里...写法使传入的参数变成了一个新的对象
         * 因此beforeCall里面如果修改了ctx.args
         * 最新的args是不会在方法里生效的
         * 先保证args可以生效
         * 不改动其余地方
         */
        const params = { ...ctx, adviceParams: aspectAdvice.adviceParams };
        await advice.beforeCall(params);
        ctx.args = params.args;
      }
    }
  }

  async afterReturn(ctx: InternalAdviceContext, result: any) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.afterReturn) {
        await advice.afterReturn({ ...ctx, adviceParams: aspectAdvice.adviceParams }, result);
      }
    }
  }

  async afterThrow(ctx: InternalAdviceContext, error: Error) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.afterThrow) {
        await advice.afterThrow({ ...ctx, adviceParams: aspectAdvice.adviceParams }, error);
      }
    }
  }

  async afterFinally(ctx: InternalAdviceContext) {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      if (advice.afterFinally) {
        await advice.afterFinally({ ...ctx, adviceParams: aspectAdvice.adviceParams });
      }
    }
  }

  async doExecute(ctx: InternalAdviceContext) {
    const lastCall = () => {
      const originMethod = Object.getPrototypeOf(this.obj)[this.method];
      return Reflect.apply(originMethod, ctx.that, ctx.args);
    };
    const functions: Array<Middleware<InternalAdviceContext>> = [];
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice: IAdvice = ctx.that[aspectAdvice.name];
      const fn = advice.around;
      if (fn) {
        functions.push(async (ctx: InternalAdviceContext<object>, next: () => Promise<any>) => {
          const fnCtx: AdviceContext = {
            ...ctx,
            adviceParams: aspectAdvice.adviceParams,
          };
          return await fn.call(advice, fnCtx, next);
        });
      }
    }
    functions.push(lastCall);
    return compose(functions)(ctx);
  }
}
