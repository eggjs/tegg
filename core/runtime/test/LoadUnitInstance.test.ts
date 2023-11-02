import assert from 'assert';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggTestContext } from './fixtures/EggTestContext';
import TestUtil from './util';
import { EggContainerFactory, LoadUnitInstance } from '..';
import CountController from './fixtures/modules/module-for-load-unit-instance/CountController';
import AppService from './fixtures/modules/multi-module/multi-module-service/AppService';
import { Bar, Foo } from './fixtures/modules/extends-module/Base';
import mm from 'mm';
import { ContextHandler } from '../src/model/ContextHandler';
import { EggContextStorage } from './fixtures/EggContextStorage';
import { FOO_ATTRIBUTE, FooLogger } from './fixtures/modules/multi-instance-module/MultiInstance';

describe('test/LoadUnit/LoadUnitInstance.test.ts', () => {
  describe('ModuleLoadUnitInstance', () => {
    let ctx: EggTestContext;

    beforeEach(() => {
      ctx = new EggTestContext();
      mm(ContextHandler, 'getContext', () => {
        return ctx;
      });
    });

    afterEach(async () => {
      await ctx.destroy({});
      mm.restore();
    });

    it('should create success', async () => {
      const instance = await TestUtil.createLoadUnitInstance('module-for-load-unit-instance');
      const countControllerProto = EggPrototypeFactory.instance.getPrototype('countController');
      const countControllerObj = await EggContainerFactory.getOrCreateEggObject(countControllerProto, countControllerProto.name);
      const countController = countControllerObj.obj as CountController;
      const countResult = await countController.getCount();
      assert.deepStrictEqual(countResult, {
        serviceCount: 0,
        serviceTempCount: 0,
        controllerTempCount: 0,
      });

      const countResult2 = await countController.getCount();
      assert.deepStrictEqual(countResult2, {
        serviceCount: 1,
        serviceTempCount: 1,
        controllerTempCount: 1,
      });

      await TestUtil.destroyLoadUnitInstance(instance);
    });

    it('should load extends class success', async () => {
      const instance = await TestUtil.createLoadUnitInstance('extends-module');
      const barProto = EggPrototypeFactory.instance.getPrototype('bar', instance.loadUnit);
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as Bar;

      const fooProto = EggPrototypeFactory.instance.getPrototype('foo', instance.loadUnit);
      const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name);
      const foo = fooObj.obj as Foo;
      assert(bar.foo);
      assert(bar.logger);
      assert(foo.logger);
      await TestUtil.destroyLoadUnitInstance(instance);
    });

    it('should load multi instance', async () => {
      const instance = await TestUtil.createLoadUnitInstance('multi-instance-module');
      const foo1Proto = EggPrototypeFactory.instance.getPrototype('foo', instance.loadUnit, [{
        attribute: FOO_ATTRIBUTE,
        value: 'foo1',
      }]);
      const foo1Obj = await EggContainerFactory.getOrCreateEggObject(foo1Proto, foo1Proto.name);
      const foo1 = foo1Obj.obj as FooLogger;

      const foo2Proto = EggPrototypeFactory.instance.getPrototype('foo', instance.loadUnit, [{
        attribute: FOO_ATTRIBUTE,
        value: 'foo2',
      }]);
      const foo2Obj = await EggContainerFactory.getOrCreateEggObject(foo2Proto, foo2Proto.name);
      const foo2 = foo2Obj.obj as FooLogger;
      assert(foo1);
      assert(foo2);
      assert(foo1 !== foo2);
      assert(foo1.loadUnitPath);
      assert(foo1.foo === 'foo1');
      assert(foo2.loadUnitPath);
      assert(foo2.foo === 'foo2');

      const obj = await EggContainerFactory.getOrCreateEggObjectFromClazz(FooLogger, 'foo', [{
        attribute: FOO_ATTRIBUTE,
        value: 'foo2',
      }]);
      assert(foo2Obj === obj);

      await TestUtil.destroyLoadUnitInstance(instance);
    });
  });

  describe('MultiModule', () => {
    let commonInstance: LoadUnitInstance;
    let repoInstance: LoadUnitInstance;
    let serviceInstance: LoadUnitInstance;

    before(async () => {
      EggContextStorage.register();
      commonInstance = await TestUtil.createLoadUnitInstance('multi-module/multi-module-common');
      repoInstance = await TestUtil.createLoadUnitInstance('multi-module/multi-module-repo');
      serviceInstance = await TestUtil.createLoadUnitInstance('multi-module/multi-module-service');
    });

    after(async () => {
      await TestUtil.destroyLoadUnitInstance(commonInstance);
      await TestUtil.destroyLoadUnitInstance(repoInstance);
      await TestUtil.destroyLoadUnitInstance(serviceInstance);
    });

    it('should get appService', async () => {
      const saveCtx = new EggTestContext();
      const findCtx = new EggTestContext();
      const saveAppServiceProto = EggPrototypeFactory.instance.getPrototype('appService', serviceInstance.loadUnit);
      const [ saveAppService, findAppService ] = await Promise.all([
        ContextHandler.run(saveCtx, async () => {
          const saveAppServiceObj = await EggContainerFactory.getOrCreateEggObject(saveAppServiceProto, saveAppServiceProto.name);
          const saveAppService = saveAppServiceObj.obj as AppService;
          await saveAppService.save({
            name: 'mock-app',
            desc: 'mock-desc',
          });
          return saveAppService;
        }),
        ContextHandler.run(findCtx, async () => {
          const findAppServiceObj = await EggContainerFactory.getOrCreateEggObject(saveAppServiceProto, saveAppServiceProto.name);
          const findAppService = findAppServiceObj.obj as AppService;
          return findAppService;
        }),
      ]);
      // not same service because ctx is different
      assert(saveAppService !== findAppService);

      const app = await findAppService.findApp('mock-app');
      assert.deepStrictEqual(app, {
        name: 'mock-app',
        desc: 'mock-desc',
      });
    });
  });
});
