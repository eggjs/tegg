import { ContextProto } from '@eggjs/core-decorator';
import { Pointcut } from '@eggjs/aop-decorator';
import { PointcutAdvice, pointcutAdviceParams } from '../hello_point_cut/HellloPointCut';

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
