import path from 'path';
import assert from 'assert';
import { EggObjectLifecycleUtil, LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggPrototypeLifecycleUtil, LoadUnitFactory, LoadUnitLifecycleUtil } from '@eggjs/tegg-metadata';
import { CrosscutAdviceFactory } from '@eggjs/aop-decorator';
import { EggTestContext } from '../../test-util';
import { CallTrace, Hello } from './fixtures/modules/hello_succeed/Hello';
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
      const ctx = new EggTestContext();
      const hello = await CoreTestHelper.getObject(Hello, ctx);
      const callTrace = await CoreTestHelper.getObject(CallTrace);
      const msg = await hello.hello('aop');
      const traceMsg = callTrace.msgs;
      assert(msg === 'withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))))');
      assert.deepStrictEqual(traceMsg, [
        {
          className: 'CrosscutAdvice',
          methodName: 'beforeCall',
          id: 233,
          name: 'aop',
        },
        {
          className: 'PointcutAdvice',
          methodName: 'beforeCall',
          id: 233,
          name: 'aop',
        },
        {
          className: 'CrosscutAdvice',
          methodName: 'afterReturn',
          id: 233,
          name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
          result: 'withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))))',
        },
        {
          className: 'PointcutAdvice',
          methodName: 'afterReturn',
          id: 233,
          name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
          result: 'withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))))',
        },
        {
          className: 'CrosscutAdvice',
          methodName: 'afterFinally',
          id: 233,
          name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
        },
        {
          className: 'PointcutAdvice',
          methodName: 'afterFinally',
          id: 233,
          name: 'withPointAroundParam(withCrosscutAroundParam(aop))',
        },
      ]);
    });
  });
});
