import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';
import { Advice, AdviceContext, Crosscut, IAdvice, Pointcut, PointcutType } from '@eggjs/aop-decorator';

export interface CallTraceMsg {
  className: string;
  methodName: string;
  id: number;
  name: string;
  result?: string;
}

@SingletonProto()
export class CallTrace {
  msgs: Array<CallTraceMsg> = [];

  addMsg(msg: CallTraceMsg) {
    this.msgs.push(msg);
  }
}

@Advice()
export class PointcutAdvice implements IAdvice<Hello> {
  @Inject()
  callTrace: CallTrace;

  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'beforeCall',
      id: ctx.that.id,
      name: ctx.args[0],
    });
  }

  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterReturn',
      id: ctx.that.id,
      name: ctx.args[0],
      result,
    });
  }

  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterFinally',
      id: ctx.that.id,
      name: ctx.args[0],
    });
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    ctx.args[0] = `withPointAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withPointAroundResult(${result})`;
  }
}

@ContextProto()
export class Hello {
  id = 233;

  @Pointcut(PointcutAdvice)
  async hello(name: string) {
    return `hello ${name}`;
  }
}

@Crosscut({
  type: PointcutType.CLASS,
  clazz: Hello,
  methodName: 'hello',
})
@Advice()
export class CrosscutAdvice implements IAdvice<Hello> {
  @Inject()
  callTrace: CallTrace;

  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'beforeCall',
      id: ctx.that.id,
      name: ctx.args[0],
    });
  }

  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'afterReturn',
      id: ctx.that.id,
      name: ctx.args[0],
      result,
    });
  }

  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'afterFinally',
      id: ctx.that.id,
      name: ctx.args[0],
    });
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    ctx.args[0] = `withCrosscutAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withCrossAroundResult(${result})`;
  }
}
