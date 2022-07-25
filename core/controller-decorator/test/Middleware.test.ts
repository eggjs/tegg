import assert from 'assert';
import { MiddlewareController, MiddlewaresController } from './fixtures/MiddlewareController';
import ControllerInfoUtil from '../src/util/ControllerInfoUtil';
import MethodInfoUtil from '../src/util/MethodInfoUtil';

describe('test/Middleware.test.ts', () => {
  it('should work', () => {
    const controllerMws = ControllerInfoUtil.getControllerMiddlewares(MiddlewareController);
    const methodMws = MethodInfoUtil.getMethodMiddlewares(MiddlewareController, 'hello');
    assert(controllerMws.length === 1);
    assert(methodMws.length === 2);
  });
  it('array params for middleware should work', () => {
    const controllerMws = ControllerInfoUtil.getControllerMiddlewares(MiddlewaresController);
    const methodMws = MethodInfoUtil.getMethodMiddlewares(MiddlewaresController, 'hello');
    assert(controllerMws.length === 1);
    assert(methodMws.length === 2);
  });
});
