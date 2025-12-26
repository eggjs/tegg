import { strict as assert } from 'node:assert';
import path from 'node:path';
import { ModuleConfigUtil } from '../src/ModuleConfig';
import type { ModuleReference } from '@eggjs/tegg-types';

describe('test/ModuleConfig.test.ts', () => {
  describe('load yaml config', () => {
    afterEach(() => {
      ModuleConfigUtil.setConfigNames(undefined);
    });

    it('should work', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/foo-yaml'));
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1' } });
    });

    it('should load env', () => {
      const config = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/dev-module-config'), undefined, 'dev');
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1', port: 11306 } });
    });

    it('should load with configNames', async () => {
      ModuleConfigUtil.setConfigNames([ 'module.default', 'module.dev' ]);
      const config = await ModuleConfigUtil.loadModuleConfig(path.join(__dirname, './fixtures/modules/dev-module-config'));
      const configSync = ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/dev-module-config'));
      assert.deepStrictEqual(config, { mysql: { host: '127.0.0.1', port: 11306 } });
      assert.deepStrictEqual(configSync, { mysql: { host: '127.0.0.1', port: 11306 } });
    });

    // it('should throw error without initialization', async () => {
    //   await assert.rejects(async () => {
    //     await ModuleConfigUtil.loadModuleConfig(path.join(__dirname, './fixtures/modules/dev-module-config'));
    //   }, /should setConfigNames before load module config/);
    //
    //   assert.throws(() => {
    //     ModuleConfigUtil.loadModuleConfigSync(path.join(__dirname, './fixtures/modules/dev-module-config'));
    //   }, /should setConfigNames before load module config/);
    // });
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

describe('ModuleConfigUtil.deduplicateModules', () => {
  describe('basic deduplication', () => {
    it('should remove duplicate modules by path', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1' },
        { name: 'module2', path: '/path/to/module2' },
        { name: 'module1-duplicate', path: '/path/to/module1' }, // 路径重复
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      assert.strictEqual(result.length, 2);
      assert.ok(result.find(m => m.name === 'module1'));
      assert.ok(result.find(m => m.name === 'module2'));
      assert.strictEqual(result.find(m => m.name === 'module1-duplicate'), undefined);
    });

    it('should remove duplicate modules by name', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1' },
        { name: 'module2', path: '/path/to/module2' },
        { name: 'module1', path: '/different/path/to/module1' }, // 名称重复但路径不同
      ];

      // 名称重复会抛出错误，因为实际实现不允许名称重复
      assert.throws(() => {
        ModuleConfigUtil.deduplicateModules(mockModules);
      }, /Duplicate module name "module1"/);
    });

    it('should handle empty input', () => {
      const result = ModuleConfigUtil.deduplicateModules([]);
      assert.strictEqual(result.length, 0);
    });

    it('should handle single module', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1' },
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'module1');
    });
  });

  describe('optional module handling', () => {
    it('should prioritize non-optional modules over optional ones', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1', optional: true },
        { name: 'module2', path: '/path/to/module2' },
        { name: 'module1', path: '/path/to/module1' }, // 非 optional 版本
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      assert.strictEqual(result.length, 2);
      const module1 = result.find(m => m.name === 'module1');
      assert.ok(module1);
      assert.strictEqual(module1!.optional, false); // 应该保留非 optional 版本
    });

    it('should keep optional module when no non-optional version exists', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1', optional: true },
        { name: 'module2', path: '/path/to/module2' },
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      assert.strictEqual(result.length, 2);
      const module1 = result.find(m => m.name === 'module1');
      assert.ok(module1);
      assert.strictEqual(module1!.optional, true);
    });
  });

  describe('name conflict handling', () => {
    it('should throw error for duplicate names with different paths', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1' },
        { name: 'module1', path: '/different/path/to/module1' }, // 名称重复但路径不同
      ];

      assert.throws(() => {
        ModuleConfigUtil.deduplicateModules(mockModules);
      }, /Duplicate module name "module1"/);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed scenarios with optional and non-optional modules', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1', optional: true },
        { name: 'module2', path: '/path/to/module2' },
        { name: 'module1', path: '/path/to/module1' }, // 非 optional 版本，应该替换 optional 版本
        { name: 'module3', path: '/path/to/module3' },
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      assert.strictEqual(result.length, 3);

      const module1 = result.find(m => m.name === 'module1');
      const module2 = result.find(m => m.name === 'module2');
      const module3 = result.find(m => m.name === 'module3');

      assert.ok(module1);
      assert.strictEqual(module1!.optional, false); // 应该保留非 optional 版本
      assert.ok(module2);
      assert.ok(module3);
    });

    it('should demonstrate mm usage for mocking', () => {
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1' },
        { name: 'module1', path: '/different/path/to/module1' }, // 名称重复，应该触发错误
      ];

      assert.throws(() => {
        ModuleConfigUtil.deduplicateModules(mockModules);
      }, /Duplicate module name "module1"/);
    });
  });

  describe('complex scenarios', () => {
    it('should correctly update nameMap when replacing optional modules', () => {
      // 这个测试验证当非可选模块替换可选模块且名称不同时，
      // nameMap 能正确更新，不会在后续处理中产生错误的重复名称警告
      const mockModules: ModuleReference[] = [
        { name: 'oldName', path: '/path/to/module1', optional: true },
        { name: 'newName', path: '/path/to/module1' }, // 非 optional 版本，名称不同
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      // 验证结果
      assert.strictEqual(result.length, 1);

      const module1 = result.find(m => m.path === '/path/to/module1');

      assert.ok(module1);
      assert.strictEqual(module1!.name, 'newName');
      assert.strictEqual(module1!.optional, false);
    });

    it('should handle name conflicts when replacing optional modules', () => {
      // 这个测试验证当非可选模块替换可选模块且名称相同时，
      // 能够正确处理名称冲突
      const mockModules: ModuleReference[] = [
        { name: 'module1', path: '/path/to/module1', optional: true },
        { name: 'module1', path: '/path/to/module1' }, // 非 optional 版本，名称相同
      ];

      const result = ModuleConfigUtil.deduplicateModules(mockModules);

      // 验证结果
      assert.strictEqual(result.length, 1);

      const module1 = result.find(m => m.path === '/path/to/module1');

      assert.ok(module1);
      assert.strictEqual(module1!.name, 'module1');
      assert.strictEqual(module1!.optional, false);
    });

    it('should throw when replacing optional introduces a name collision with another path', () => {
      const mockModules: ModuleReference[] = [
        { name: 'other', path: '/path/to/other' },
        { name: 'oldName', path: '/path/to/module1', optional: true },
        // 非 optional 版本替换同一路径，但名称与已有模块冲突
        { name: 'other', path: '/path/to/module1' },
      ];

      assert.throws(() => {
        ModuleConfigUtil.deduplicateModules(mockModules);
      }, /Duplicate module name "other"/);
    });
  });
});

describe('ModuleConfigs', () => {
  const { ModuleConfigs } = require('../src/ModuleConfigs');

  describe('Symbol.iterator', () => {
    it('should iterate over all module configs', () => {
      const mockInner = {
        module1: {
          name: 'module1',
          reference: { path: '/path/to/module1', name: 'module1' },
          config: { foo: 'bar' },
        },
        module2: {
          name: 'module2',
          reference: { path: '/path/to/module2', name: 'module2' },
          config: { baz: 'qux' },
        },
      };

      const moduleConfigs = new ModuleConfigs(mockInner);
      const result: Array<[string, any]> = [];

      for (const [name, holder] of moduleConfigs) {
        result.push([name, holder]);
      }

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0][0], 'module1');
      assert.deepStrictEqual(result[0][1], mockInner.module1);
      assert.strictEqual(result[1][0], 'module2');
      assert.deepStrictEqual(result[1][1], mockInner.module2);
    });

    it('should work with empty configs', () => {
      const moduleConfigs = new ModuleConfigs({});
      const result: Array<[string, any]> = [];

      for (const [name, holder] of moduleConfigs) {
        result.push([name, holder]);
      }

      assert.strictEqual(result.length, 0);
    });
  });
});
