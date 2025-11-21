import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Middleware,
} from '@eggjs/tegg';
import { TestAdvice } from '../advice-module/advice/TestAdvice';
import { AnotherAdvice } from '../advice-module/advice/AnotherAdvice';

@HTTPController({
  path: '/test',
})
@Middleware(TestAdvice)
export class TestController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/class-middleware',
  })
  async classMiddleware() {
    return {
      message: 'class middleware',
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/method-middleware',
  })
  @Middleware(AnotherAdvice)
  async methodMiddleware() {
    return {
      message: 'method middleware',
    };
  }
}
