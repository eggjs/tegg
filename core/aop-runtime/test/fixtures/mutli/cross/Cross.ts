import { AccessLevel } from '@eggjs/core-decorator';
import { Advice, Crosscut } from '@eggjs/aop-decorator';
import { AdviceContext, IAdvice, PointcutType } from '@eggjs/tegg-types';
import { Base } from '../c/Base';

export const pointcutAdviceParams = {
  point: Math.random().toString(),
  cut: Math.random().toString(),
};

@Crosscut({
  type: PointcutType.CLASS,
  clazz: Base,
  methodName: 'hello',
})
@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class BaseAdvice implements IAdvice<Base> {

  async beforeCall(_ctx: AdviceContext<Base>): Promise<void> {
  }

  async afterReturn(_ctx: AdviceContext<Base>, _result: any): Promise<void> {
  }

  async afterThrow(_ctx: AdviceContext<Base>, _error: Error): Promise<void> {
  }

  async afterFinally(_ctx: AdviceContext<Base>): Promise<void> {
  }

  async around(_ctx: AdviceContext<Base>, _next: () => Promise<any>): Promise<any> {
  }
}
