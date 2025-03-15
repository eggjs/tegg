import assert from 'node:assert';
import { AccessLevel, ObjectInitType } from '@eggjs/core-decorator';
import { Advice } from '@eggjs/aop-decorator';
import { AdviceContext, IAdvice } from '@eggjs/tegg-types';
import { Hello } from '../hello_succeed/Hello.js';

const STATE_SYMBOL = Symbol.for('STATE_SYMBOL');

@Advice({
  initType: ObjectInitType.SINGLETON,
  accessLevel: AccessLevel.PUBLIC,
})
export class StatePointcutAdvice implements IAdvice<Hello> {
  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    ctx.set(STATE_SYMBOL, 2333);
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    const result = await next();
    const state = ctx.get(STATE_SYMBOL);
    return `withStatePointAroundResult(${result})(${state})`;
  }
}
