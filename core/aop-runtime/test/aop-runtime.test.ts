import assert from 'node:assert';
import path from 'node:path';
import mm from 'mm';
import { EggObjectLifecycleUtil, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggPrototypeLifecycleUtil, LoadUnitFactory, LoadUnitLifecycleUtil } from '@eggjs/tegg-metadata';
import type { LoadUnitInstance } from '@eggjs/tegg-types';
import { CrosscutAdviceFactory } from '@eggjs/aop-decorator';
import { CoreTestHelper, EggTestContext } from '../../test-util';
import { Hello } from './fixtures/modules/hello_succeed/Hello';
import { crosscutAdviceParams } from './fixtures/modules/hello_cross_cut/HelloCrossCut';
import { pointcutAdviceParams } from './fixtures/modules/hello_point_cut/HelloPointCut';
import { EggObjectAopHook } from '../src/EggObjectAopHook';
import { LoadUnitAopHook } from '../src/LoadUnitAopHook';
import { EggPrototypeCrossCutHook } from '../src/EggPrototypeCrossCutHook';
import { crossCutGraphHook } from '../src/CrossCutGraphHook';
import { pointCutGraphHook } from '../src/PointCutGraphHook';
import { CallTrace } from './fixtures/modules/hello_cross_cut/CallTrace';
import { HelloConstructorInject } from './fixtures/modules/constructor_inject_aop/Hello';

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
        path.join(__dirname, 'fixtures/modules/hello_point_cut'),
        path.join(__dirname, 'fixtures/modules/hello_cross_cut'),
      ], [
        crossCutGraphHook,
        pointCutGraphHook,
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

  describe('aop constructor should work', () => {
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
        path.join(__dirname, 'fixtures/modules/constructor_inject_aop'),
        path.join(__dirname, 'fixtures/modules/hello_point_cut'),
        path.join(__dirname, 'fixtures/modules/hello_cross_cut'),
      ], [
        crossCutGraphHook,
        pointCutGraphHook,
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
        const hello = await CoreTestHelper.getObject(HelloConstructorInject);
        const callTrace = await CoreTestHelper.getObject(CallTrace);
        const msg = await hello.hello('aop');
        const traceMsg = callTrace.msgs;
        console.log('msg: ', msg, traceMsg);
        assert.deepStrictEqual(msg, `withPointAroundResult(hello withPointAroundParam(aop)${JSON.stringify(pointcutAdviceParams)})`);
        assert.deepStrictEqual(traceMsg, [
          {
            className: 'PointcutAdvice',
            methodName: 'beforeCall',
            id: 233,
            name: 'aop',
            adviceParams: pointcutAdviceParams,
          },
          {
            className: 'PointcutAdvice',
            methodName: 'afterReturn',
            id: 233,
            name: 'withPointAroundParam(aop)',
            result: `withPointAroundResult(hello withPointAroundParam(aop)${JSON.stringify(pointcutAdviceParams)})`,
            adviceParams: pointcutAdviceParams,
          },
          {
            className: 'PointcutAdvice',
            methodName: 'afterFinally',
            id: 233,
            name: 'withPointAroundParam(aop)',
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
        const hello = await CoreTestHelper.getObject(HelloConstructorInject);
        let helloMocked = false;
        mm(HelloConstructorInject.prototype, 'hello', async () => {
          helloMocked = true;
        });
        await hello.hello('aop');
        assert(helloMocked);
      });
    });
  });
});
