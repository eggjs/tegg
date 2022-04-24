import { ContextProto } from '@eggjs/core-decorator';
import { Advice, AdviceContext, IAdvice, Pointcut } from '@eggjs/aop-decorator';

@Advice()
class PointcutAdvice implements IAdvice<Hello> {
  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    console.info(ctx);
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
