import {
  Advice,
  AdviceContext,
  IAdvice,
} from '@eggjs/tegg/aop';
import { AccessLevel } from '@eggjs/tegg-types';

@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class BarMethodAdvice implements IAdvice {
  async around(_ctx: AdviceContext, next: () => Promise<any>) {
    const body = await next();
    body.aopList = body.aopList || [];
    body.aopList.push(BarMethodAdvice.name);
    return body;
  }
}
