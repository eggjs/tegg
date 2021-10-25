import path from 'path';
import assert from 'assert';
import { EggLoadUnitType, LoadUnitFactory } from '..';
import { InitTypeQualifierAttribute, ObjectInitType } from '@eggjs/core-decorator';
import { TestLoader } from './fixtures/TestLoader';


describe('test/LoadUnit/LoadUnit.test.ts', () => {
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
      assert(appRepoProto);
      assert(sprintRepoProto);
      assert(userRepoProto);
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
      const countServiceProto = loadUnit.getEggPrototype('countService', []);
      assert(countServiceProto);
    });
  });
});
