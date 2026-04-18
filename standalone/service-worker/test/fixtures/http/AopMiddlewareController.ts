import { HTTPMethodEnum, HTTPController, HTTPMethod, Middleware } from '@eggjs/tegg';
import { HttpTestAdvice } from './HttpTestAdvice';

@Middleware(HttpTestAdvice)
@HTTPController()
export class AopMiddlewareController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/middleware/aop' })
  async aopMiddlewareTest() {
    return { msg: 'hello' };
  }
}
