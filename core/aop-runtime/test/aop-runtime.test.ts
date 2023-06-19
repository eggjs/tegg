import path from 'path';
import mm from 'mm';
import assert from 'assert';
import { EggObjectLifecycleUtil, LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggPrototypeLifecycleUtil, LoadUnitFactory, LoadUnitLifecycleUtil } from '@eggjs/tegg-metadata';
import { CrosscutAdviceFactory } from '@eggjs/aop-decorator';
import { EggTestContext } from '../../test-util';
import { CallTrace, Hello, crosscutAdviceParams, pointcutAdviceParams } from './fixtures/modules/hello_succeed/Hello';
import { CoreTestHelper } from '../../test-util/CoreTestHelper';
import { EggObjectAopHook } from '../src/EggObjectAopHook';
import { LoadUnitAopHook } from '../src/LoadUnitAopHook';
import { EggPrototypeCrossCutHook } from '../src/EggPrototypeCrossCutHook';

describe('test/aop-runtime.test.ts', () => {
  describe('succeed call', () => {
    let modules: Array<LoadUnitInstance>;
    let crosscutAdviceFactory: CrosscutAdviceFactory;
    let eggObjectAopHook: EggObjectAopHook;
    let loadUnitAopHook: LoadUnitAopHook;
    let eggPrototypeCrossCutHook: EggPrototypeCrossCutHook;

    beforeEach(async () => {
      crosscutAdviceFactory = new CrosscutAdviceFactory();
      eggObjectAopHook = new EggObjectAopHook();
      loadUnitAopHook = new LoadUnitAopHook(crosscutAdviceFactory);
      eggPrototypeCrossCutHook = new EggPrototypeCrossCutHook(crosscutAdviceFactory);
      EggPrototypeLifecycleUtil.registerLifecycle(eggPrototypeCrossCutHook);
      LoadUnitLifecycleUtil.registerLifecycle(loadUnitAopHook);
      EggObjectLifecycleUtil.registerLifecycle(eggObjectAopHook);

      modules = await CoreTestHelper.prepareModules([
        path.join(__dirname, '..'),
        path.join(__dirname, 'fixtures/modules/hello_succeed'),
      ]);
    });

    afterEach(async () => {
      for (const module of modules) {
        await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
      }
      EggPrototypeLifecycleUtil.deleteLifecycle(eggPrototypeCrossCutHook);
      LoadUnitLifecycleUtil.deleteLifecycle(loadUnitAopHook);
      EggObjectLifecycleUtil.deleteLifecycle(eggObjectAopHook);
    });

    it('should work', async () => {
      await EggTestContext.mockContext(async () => {
        const hello = await CoreTestHelper.getObject(Hello);
        const callTrace = await CoreTestHelper.getObject(CallTrace);
        const msg = await hello.hello('aop');
        const traceMsg = callTrace.msgs;
        assert.deepStrictEqual(msg, `withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))${JSON.stringify(pointcutAdviceParams)})${JSON.stringify(crosscutAdviceParams)})`);
        assert.deepStrictEqual(traceMsg, [
          {
            className: 'CrosscutAdvice',
            methodName: 'beforeCall',
            id: 233,
            name: 'aop',
            adviceParams: crosscutAdviceParams,
          },
          {
            className: 'PointcutAdvice',
            methodName: 'beforeCall',
            id: 233,
            name: 'aop',
            adviceParams: pointcutAdviceParams,
          },
          {
            className: 'CrosscutAdvice',
            methodName: 'afterReturn',
            id: 233,
            name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
            result: `withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))${JSON.stringify(pointcutAdviceParams)})${JSON.stringify(crosscutAdviceParams)})`,
            adviceParams: crosscutAdviceParams,
          },
          {
            className: 'PointcutAdvice',
            methodName: 'afterReturn',
            id: 233,
            name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
            result: `withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))${JSON.stringify(pointcutAdviceParams)})${JSON.stringify(crosscutAdviceParams)})`,
            adviceParams: pointcutAdviceParams,
          },
          {
            className: 'CrosscutAdvice',
            methodName: 'afterFinally',
            id: 233,
            name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
            adviceParams: crosscutAdviceParams,
          },
          {
            className: 'PointcutAdvice',
            methodName: 'afterFinally',
            id: 233,
            name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
            adviceParams: pointcutAdviceParams,
          },
        ]);

        await assert.rejects(async () => {
          await hello.helloWithException('foo');
        }, new Error('ops, exception for withPointAroundParam(foo)'));
        assert.deepStrictEqual(callTrace.msgs[callTrace.msgs.length - 2], {
          className: 'PointcutAdvice',
          methodName: 'afterThrow',
          id: 233,
          name: 'withPointAroundParam(foo)',
          result: 'ops, exception for withPointAroundParam(foo)',
          adviceParams: pointcutAdviceParams,
        });
      });
    });

    it('mock should work', async () => {
      await EggTestContext.mockContext(async () => {
        const hello = await CoreTestHelper.getObject(Hello);
        let helloMocked = false;
        mm(Hello.prototype, 'hello', async () => {
          helloMocked = true;
        });
        await hello.hello('aop');
        assert(helloMocked);
      });
    });
  });

  describe('should failed', () => {
    let crosscutAdviceFactory: CrosscutAdviceFactory;
    let eggObjectAopHook: EggObjectAopHook;
    let loadUnitAopHook: LoadUnitAopHook;
    let eggPrototypeCrossCutHook: EggPrototypeCrossCutHook;

    beforeEach(async () => {
      crosscutAdviceFactory = new CrosscutAdviceFactory();
      eggObjectAopHook = new EggObjectAopHook();
      loadUnitAopHook = new LoadUnitAopHook(crosscutAdviceFactory);
      eggPrototypeCrossCutHook = new EggPrototypeCrossCutHook(crosscutAdviceFactory);
      EggPrototypeLifecycleUtil.registerLifecycle(eggPrototypeCrossCutHook);
      LoadUnitLifecycleUtil.registerLifecycle(loadUnitAopHook);
      EggObjectLifecycleUtil.registerLifecycle(eggObjectAopHook);
    });

    it('should throw', async () => {
      await assert.rejects(async () => {
        await CoreTestHelper.prepareModules([
          path.join(__dirname, '..'),
          path.join(__dirname, 'fixtures/modules/should_throw'),
        ]);
      }, /Aop Advice\(PointcutAdvice\) not found in loadUnits/);
    });
  });
});
