import {
  Advice,
  AdviceContext,
  IAdvice,
} from '@eggjs/tegg/aop';
import { AccessLevel } from '@eggjs/tegg-types';

@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class TestAdvice implements IAdvice {
  async around(_ctx: AdviceContext, next: () => Promise<any>) {
    const body = await next();
    if (body) {
      body.adviceApplied = true;
    }
    return body;
  }
}
