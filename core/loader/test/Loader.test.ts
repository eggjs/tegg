import assert from 'assert';
import path from 'path';
import { LoaderFactory, LoaderUtil } from '..';
import { EggLoadUnitType } from '@eggjs/tegg-metadata';

describe('test/loader/Loader.test.ts', () => {
  describe('module loader', () => {
    it('should load module', () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = loader.load();
      assert(prototypes.length === 4);
      const appRepoProto = prototypes.find(t => t.name === 'AppRepo');
      const appRepo2Proto = prototypes.find(t => t.name === 'AppRepo2');
      const sprintRepoProto = prototypes.find(t => t.name === 'SprintRepo');
      const userRepoProto = prototypes.find(t => t.name === 'UserRepo');
      assert(appRepoProto);
      assert(appRepo2Proto);
      assert(sprintRepoProto);
      assert(userRepoProto);
    });

    it('should not load test/coverage files', () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-with-test');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = loader.load();
      assert(prototypes.length === 1);
    });

    it('should set extraFilePattern without error', () => {
      LoaderUtil.setConfig({ extraFilePattern: [ '!extra' ] });
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-with-extra');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = loader.load();
      assert(prototypes.length === 1);
    });
  });

  if (process.env.TS_NODE_TRANSPILE_ONLY !== 'true') {
    // If use ts-node transpile no compile error will throw
    describe('file has tsc error', () => {
      it('should failed', () => {
        const repoModulePath = path.join(__dirname, './fixtures/modules/loader-failed');
        const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
        assert.throws(() => {
          loader.load();
        }, /'name' is declared but its value is never read/);
      });
    });
  }
});
