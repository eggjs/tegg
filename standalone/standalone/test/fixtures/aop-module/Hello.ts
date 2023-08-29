import {
  ContextProto,
  Inject,
  SingletonProto,
} from '@eggjs/tegg';
import {
  Advice,
  AdviceContext,
  Crosscut,
  IAdvice,
  Pointcut,
  PointcutType,
} from '@eggjs/tegg/aop';
import assert from 'assert';

export interface CallTraceMsg {
  className: string;
  methodName: string;
  id: number;
  name: string;
  result?: string;
  adviceParams?: any;
}

@SingletonProto()
export class CallTrace {
  msgs: Array<CallTraceMsg> = [];

  addMsg(msg: CallTraceMsg) {
    this.msgs.push(msg);
  }
}

export const pointcutAdviceParams = {
  point: Math.random()
    .toString(),
  cut: Math.random()
    .toString(),
};

@Advice()
export class PointcutAdvice implements IAdvice<Hello> {
  @Inject()
  callTrace: CallTrace;

  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'beforeCall',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterReturn',
      id: ctx.that.id,
      name: ctx.args[0],
      result,
      adviceParams: ctx.adviceParams,
    });
  }

  async afterThrow(ctx: AdviceContext<Hello, any>, error: Error): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterThrow',
      id: ctx.that.id,
      name: ctx.args[0],
      result: error.message,
      adviceParams: ctx.adviceParams,
    });
  }

  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterFinally',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    ctx.args[0] = `withPointAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withPointAroundResult(${result}${JSON.stringify(pointcutAdviceParams)})`;
  }
}

@ContextProto()
export class Hello {
  id = 233;

  @Pointcut(PointcutAdvice, { adviceParams: pointcutAdviceParams })
  async hello(name: string) {
    return `hello ${name}`;
  }

  @Pointcut(PointcutAdvice, { adviceParams: pointcutAdviceParams })
  async helloWithException(name: string) {
    throw new Error(`ops, exception for ${name}`);
  }

}

export const crosscutAdviceParams = {
  cross: Math.random()
    .toString(),
  cut: Math.random()
    .toString(),
};

@Crosscut({
  type: PointcutType.CLASS,
  clazz: Hello,
  methodName: 'hello',
}, { adviceParams: crosscutAdviceParams })
@Advice()
export class CrosscutAdvice implements IAdvice<Hello, String> {
  @Inject()
  callTrace: CallTrace;

  async beforeCall(ctx: AdviceContext<Hello, {}>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'beforeCall',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'afterReturn',
      id: ctx.that.id,
      name: ctx.args[0],
      result,
      adviceParams: ctx.adviceParams,
    });
  }

  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'afterFinally',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    ctx.args[0] = `withCrosscutAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withCrossAroundResult(${result}${JSON.stringify(ctx.adviceParams)})`;
  }
}
