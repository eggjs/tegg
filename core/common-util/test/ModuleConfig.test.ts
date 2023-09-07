import assert from 'assert';
import path from 'path';
import { ModuleConfigUtil } from '../src/ModuleConfig';

describe('test/ModuleConfig.test.ts', () => {
  describe('load yaml config', () => {
    it('should work', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/foo-yaml'));
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1' } });
    });

    it('should load env', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/dev-module-config'), undefined, 'dev');
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1', port: 11306 } });
    });
  });

  describe('load module reference', () => {
    describe('module.json not exits', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-no-module-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA' },
          { path: path.join(fixturesPath, 'app/module-b'), name: 'moduleB' },
          { path: path.join(fixturesPath, 'app/module-b/test/fixtures/module-e'), name: 'moduleE' },
          { path: path.join(fixturesPath, 'node_modules/module-c'), name: 'moduleC' },
        ]);
      });

      it('duplicated module', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-no-module-json-duplicated');
        assert.throws(() => { ModuleConfigUtil.readModuleReference(fixturesPath); }, /duplicate import of module reference/, 'did not throw with expected message');
      });

      describe('has symlink', () => {
        it('should work', () => {
          const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-symlink');
          const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
          assert.deepStrictEqual(ref, [
            { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA' },
          ]);
        });
      });
    });

    describe('module.json exits', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-module-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA' },
          { path: path.join(fixturesPath, 'app/module-b'), name: 'moduleB' },
        ]);
      });
    });

    describe('module.json has pkg', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-module-pkg-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath, {
          cwd: fixturesPath,
        });
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'node_modules/module-a'), name: 'moduleA' },
        ]);
      });
    });

    describe('filter module', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-modules');
        const readModuleOptions = {
          cwd: fixturesPath,
          extraFilePattern: [ '!**/dist' ],
        };
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath, readModuleOptions);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a'), name: 'moduleA' },
        ]);
      });
    });
  });

  describe('read package dependencies', () => {

    it('should success if package.json not exist', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/foo');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, []);
    });

    it('should success whether dependencies entry has exported package.json', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/packages/d');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, [{
        path: path.resolve(__dirname, './fixtures/monorepo/packages/d/node_modules/e'),
        name: 'e',
      }]);
    });

    it('should read dependencies from self node_modules', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/packages/a');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, [{
        path: path.resolve(__dirname, './fixtures/monorepo/packages/a/node_modules/c'),
        name: 'c',
      }]);
    });

    it('should read dependencies from parent node_modules', async () => {
      const dir = path.resolve(__dirname, './fixtures/monorepo/packages/b');
      const ret = ModuleConfigUtil.readModuleFromNodeModules(dir);
      assert.deepStrictEqual(ret, [{
        path: path.resolve(__dirname, './fixtures/monorepo/packages/a'),
        name: 'a',
      }]);
    });
  });
});
