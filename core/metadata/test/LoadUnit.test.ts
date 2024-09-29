import path from 'path';
import assert from 'assert';
import { AppGraph, EggLoadUnitType, LoadUnitFactory, LoadUnitLifecycleUtil, LoadUnitMultiInstanceProtoHook, ModuleNode } from '..';
import { InitTypeQualifierAttribute, ObjectInitType } from '@eggjs/core-decorator';
import { TestLoader } from './fixtures/TestLoader';
import { FOO_ATTRIBUTE } from './fixtures/modules/multi-instance-module/MultiInstance';
import { App } from './fixtures/modules/app-multi-inject-multi/app/modules/app/App';
import { App2 } from './fixtures/modules/app-multi-inject-multi/app/modules/app2/App';
import { BizManager } from './fixtures/modules/app-multi-inject-multi/app/modules/bar/BizManager';
import { Secret } from './fixtures/modules/app-multi-inject-multi/app/modules/foo/Secret';


describe('test/LoadUnit/LoadUnit.test.ts', () => {
  describe('inject with constructor', () => {
    it('should not inherit parent class', async () => {
      const extendsConstructorModule = path.join(__dirname, './fixtures/modules/extends-constructor-module');
      const loader = new TestLoader(extendsConstructorModule);
      const loadUnit = await LoadUnitFactory.createLoadUnit(extendsConstructorModule, EggLoadUnitType.MODULE, loader);

      const fooConstructor = loadUnit.getEggPrototype('fooConstructor', [{ attribute: InitTypeQualifierAttribute, value: ObjectInitType.CONTEXT }]);
      const fooConstructorLogger = loadUnit.getEggPrototype('fooConstructorLogger', [{ attribute: InitTypeQualifierAttribute, value: ObjectInitType.CONTEXT }]);

      assert.strictEqual(fooConstructor.length, 1);
      assert.strictEqual(fooConstructor[0].injectObjects!.length, 1);
      assert.strictEqual(fooConstructor[0].injectObjects![0].refName, 'bar');

      assert.strictEqual(fooConstructorLogger.length, 1);
      assert.strictEqual(fooConstructorLogger[0].injectObjects!.length, 2);
      assert.strictEqual(fooConstructorLogger[0].injectObjects![0].refName, 'bar');
      assert.strictEqual(fooConstructorLogger[0].injectObjects![1].refName, 'logger');
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

  });
  describe('ModuleLoadUnit', () => {
    it('should create success', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/load-unit');
      const loader = new TestLoader(repoModulePath);
      const loadUnit = await LoadUnitFactory.createLoadUnit(repoModulePath, EggLoadUnitType.MODULE, loader);
      assert(loadUnit.id === 'LOAD_UNIT:app-repo');
      assert(loadUnit.unitPath === repoModulePath);
      const appRepoProto = loadUnit.getEggPrototype('appRepo', [{ attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON }]);
      const sprintRepoProto = loadUnit.getEggPrototype('sprintRepo', [{ attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON }]);
      const userRepoProto = loadUnit.getEggPrototype('userRepo', [{ attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON }]);
      assert.strictEqual(appRepoProto.length, 1);
      assert.strictEqual(appRepoProto[0].className, 'AppRepo');
      assert.strictEqual(sprintRepoProto.length, 1);
      assert.strictEqual(userRepoProto.length, 1);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it('recursive deps should should throw error', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/recursive-load-unit');
      const loader = new TestLoader(repoModulePath);
      await assert.rejects(() => {
        return LoadUnitFactory.createLoadUnit(repoModulePath, EggLoadUnitType.MODULE, loader);
      }, /proto has recursive deps/);
    });
  });

  describe('invalidate load unit', () => {
    it('should init failed', async () => {
      const invalidateModulePath = path.join(__dirname, './fixtures/modules/invalidate-module');
      const loader = new TestLoader(invalidateModulePath);
      try {
        await LoadUnitFactory.createLoadUnit(invalidateModulePath, EggLoadUnitType.MODULE, loader);
        throw new Error('should throw error');
      } catch (e) {
        assert(e.message.includes('Object persistenceService not found in LOAD_UNIT:multiModuleInvalidateService'));
        assert(e.message.includes('faq/TEGG_EGG_PROTO_NOT_FOUND'));
      }
    });

    it('should init failed with multi proto', async () => {
      const invalidateModulePath = path.join(__dirname, './fixtures/modules/invalid-multimodule');
      const loader = new TestLoader(invalidateModulePath);

      try {
        await LoadUnitFactory.createLoadUnit(invalidateModulePath, EggLoadUnitType.MODULE, loader);
        throw new Error('should throw error');
      } catch (e) {
        assert(e.message.includes('multi proto found for name:invalidateService'));
        assert(e.message.includes('result is'));
        assert(e.message.includes('faq/TEGG_MULTI_PROTO_FOUND'));
      }
    });
  });

  describe('try use obj init type as property init type qualifier', () => {
    it('should get the right proto', async () => {
      const sameObjectModulePath = path.join(__dirname, './fixtures/modules/same-name-object');
      const loader = new TestLoader(sameObjectModulePath);
      const loadUnit = await LoadUnitFactory.createLoadUnit(sameObjectModulePath, EggLoadUnitType.MODULE, loader);
      const countServiceProto = loadUnit.getEggPrototype('countService', [])[0];
      assert(countServiceProto);
    });

    it('should use context proto first', async () => {
      const sameObjectModulePath = path.join(__dirname, './fixtures/modules/same-name-object');
      const loader = new TestLoader(sameObjectModulePath);
      const loadUnit = await LoadUnitFactory.createLoadUnit(sameObjectModulePath, EggLoadUnitType.MODULE, loader);
      const singletonProto = loadUnit.getEggPrototype('singletonCountService', [])[0];
      assert(singletonProto);
      const injectProto = singletonProto.injectObjects.find(t => t.objName === 'appCache');
      assert(injectProto);
      assert(injectProto.proto.initType === ObjectInitType.CONTEXT);
    });
  });

  describe('MultiInstance proto', () => {
    let loadUnitMultiInstanceProtoHook: LoadUnitMultiInstanceProtoHook;
    beforeEach(() => {
      loadUnitMultiInstanceProtoHook = new LoadUnitMultiInstanceProtoHook();
      LoadUnitLifecycleUtil.registerLifecycle(loadUnitMultiInstanceProtoHook);
    });

    afterEach(() => {
      LoadUnitLifecycleUtil.deleteLifecycle(loadUnitMultiInstanceProtoHook);
    });

    it('should load static work', async () => {
      const multiInstanceModule = path.join(__dirname, './fixtures/modules/multi-instance-module');
      const loader = new TestLoader(multiInstanceModule);
      const loadUnit = await LoadUnitFactory.createLoadUnit(multiInstanceModule, EggLoadUnitType.MODULE, loader);
      assert(loadUnit.id === 'LOAD_UNIT:multiInstanceModule');
      assert(loadUnit.unitPath === multiInstanceModule);
      const foo1Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'foo1' }]);
      const foo2Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'foo2' }]);
      assert(foo1Prototype);
      assert(foo1Prototype.length === 1);
      assert.strictEqual(foo1Prototype[0].className, 'FooLogger');
      assert(foo2Prototype);
      assert(foo2Prototype.length === 1);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it('should load callback work', async () => {
      const multiCallbackInstanceModule = path.join(__dirname, './fixtures/modules/multi-callback-instance-module');
      const loader = new TestLoader(multiCallbackInstanceModule);
      const loadUnit = await LoadUnitFactory.createLoadUnit(multiCallbackInstanceModule, EggLoadUnitType.MODULE, loader);
      assert(loadUnit.id === 'LOAD_UNIT:multiCallbackInstanceModule');
      assert(loadUnit.unitPath === multiCallbackInstanceModule);
      const foo1Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'foo' }]);
      const foo2Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'bar' }]);
      assert(foo1Prototype);
      assert(foo1Prototype.length === 1);
      assert(foo2Prototype);
      assert(foo2Prototype.length === 1);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it('should multi instance inject multi instance work', async () => {
      const graph = new AppGraph();
      const appModuleNode = new ModuleNode({
        name: 'app',
        path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app'),
      });
      appModuleNode.addClazz(App);
      graph.addNode(appModuleNode);

      const app2ModuleNode = new ModuleNode({
        name: 'app2',
        path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app2'),
      });
      app2ModuleNode.addClazz(App2);
      graph.addNode(app2ModuleNode);

      const barOptionalModuleNode = new ModuleNode({
        name: 'bar',
        path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/bar'),
      });
      barOptionalModuleNode.addClazz(BizManager);
      graph.addNode(barOptionalModuleNode);
      const fooOptionalModuleNode = new ModuleNode({
        name: 'foo',
        path: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/foo'),
      });
      fooOptionalModuleNode.addClazz(Secret);
      graph.addNode(fooOptionalModuleNode);
      graph.build();
      graph.sort();

      LoadUnitMultiInstanceProtoHook.setAllClassList(graph.getClazzList());

      const appInstanceModule = path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app');
      const app2InstanceModule = path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app2');

      const loader = new TestLoader(appInstanceModule);
      const loadUnit = await LoadUnitFactory.createLoadUnit(appInstanceModule, EggLoadUnitType.MODULE, loader);
      const loader2 = new TestLoader(app2InstanceModule);
      const loadUnit2 = await LoadUnitFactory.createLoadUnit(app2InstanceModule, EggLoadUnitType.MODULE, loader2);

      const app1Prototype = loadUnit.getEggPrototype('app', []);
      const app2Prototype = loadUnit.getEggPrototype('app2', []);

      assert(app1Prototype);
      assert(app2Prototype);

      await LoadUnitFactory.destroyLoadUnit(loadUnit);
      await LoadUnitFactory.destroyLoadUnit(loadUnit2);
      LoadUnitMultiInstanceProtoHook.clear();
    });
  });
});
