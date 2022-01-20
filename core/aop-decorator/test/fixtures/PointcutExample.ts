import { ContextProto } from '@eggjs/core-decorator';
import { Advice, AdviceContext, IAdvice, Pointcut } from '../..';

@Advice()
export class PointcutAdviceBeforeCallExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@Advice()
export class PointcutAdviceAfterReturnExample implements IAdvice {
  async afterReturn(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@ContextProto()
export class PointcutExample {
  @Pointcut(PointcutAdviceBeforeCallExample)
  @Pointcut(PointcutAdviceAfterReturnExample)
  hello() {
    console.log('hello');
  }
}
