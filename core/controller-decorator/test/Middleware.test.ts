import assert from 'node:assert';
import { MiddlewareController, MiddlewaresController } from './fixtures/MiddlewareController';
import ControllerInfoUtil from '../src/util/ControllerInfoUtil';
import MethodInfoUtil from '../src/util/MethodInfoUtil';
import {
  AopMiddlewareController,
  BarAdvice,
  BarMethodAdvice,
  FooAdvice,
  FooMethodAdvice,
} from './fixtures/AopMiddlewareController';

describe('test/Middleware.test.ts', () => {
  it('should work', () => {
    const controllerMws = ControllerInfoUtil.getControllerMiddlewares(MiddlewareController);
    const methodMws = MethodInfoUtil.getMethodMiddlewares(MiddlewareController, 'hello');
    assert(controllerMws.length === 1);
    assert(methodMws.length === 2);
  });
  it('Middleware with muti params should work', () => {
    const controllerMws = ControllerInfoUtil.getControllerMiddlewares(MiddlewaresController);
    const methodMws = MethodInfoUtil.getMethodMiddlewares(MiddlewaresController, 'hello');
    assert(controllerMws.length === 1);
    assert(methodMws.length === 2);
  });

  it('controller Aop Middleware should work', () => {
    const controllerAopMws = ControllerInfoUtil.getControllerAopMiddlewares(AopMiddlewareController);
    const helloMethodMws = MethodInfoUtil.getMethodAopMiddlewares(AopMiddlewareController, 'hello');
    const byeMethodMws = MethodInfoUtil.getMethodAopMiddlewares(AopMiddlewareController, 'bye');
    assert.deepStrictEqual(controllerAopMws, [ FooAdvice, BarAdvice ]);
    assert.deepStrictEqual(helloMethodMws, [ FooMethodAdvice, BarMethodAdvice ]);
    assert.deepStrictEqual(byeMethodMws, []);
  });
});
