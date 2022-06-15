import assert from 'assert';
import path from 'path';
import { ModuleConfigUtil } from '../src/ModuleConfig';

describe('test/ModuleConfig.test.ts', () => {
  describe('load yaml config', () => {
    it('should work', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/foo-yaml'));
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1' } });
    });
  });

  describe('load module reference', () => {
    describe('module.json not exits', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-no-module-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a') },
          { path: path.join(fixturesPath, 'app/module-b') },
          { path: path.join(fixturesPath, 'app/module-b/test/fixtures/module-e') },
        ]);
      });

      describe('has symlink', () => {
        it('should work', () => {
          const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-symlink');
          const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
          assert.deepStrictEqual(ref, [
            { path: path.join(fixturesPath, 'app/module-a') },
          ]);
        });
      });
    });

    describe('module.json exits', () => {
      it('should work', () => {
        const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-module-json');
        const ref = ModuleConfigUtil.readModuleReference(fixturesPath);
        assert.deepStrictEqual(ref, [
          { path: path.join(fixturesPath, 'app/module-a') },
          { path: path.join(fixturesPath, 'app/module-b') },
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
          { path: path.join(fixturesPath, 'node_modules/module-a') },
        ]);
      });
    });
  });
});
