import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';
import { BarService } from './fixtures/apps/optional-inject/app/modules/module-a/BarService';
import { FooService } from './fixtures/apps/optional-inject/app/modules/module-a/FooService';

describe('plugin/tegg/test/Inject.test.ts', () => {
  let app;

  beforeEach(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
  });

  afterEach(async () => {
    await app.close();
    mm.restore();
  });

  describe('optional', () => {
    beforeEach(async () => {
      app = mm.app({
        baseDir: path.join(__dirname, 'fixtures/apps/optional-inject'),
        framework: require.resolve('egg'),
      });
      await app.ready();
    });

    it('should work with property', async () => {
      const barService: BarService = await app.getEggObject(BarService);
      const res = barService.bar();
      assert.deepStrictEqual(res, {
        nil1: 'Y',
        nil2: 'Y',
      });
    });

    it('should work with constructor', async () => {
      const fooService: FooService = await app.getEggObject(FooService);
      const res = fooService.foo();
      assert.deepStrictEqual(res, {
        nil1: 'Y',
        nil2: 'Y',
      });
    });
  });

  it('should throw error if no proto found', async () => {
    app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/invalid-inject'),
      framework: require.resolve('egg'),
    });
    await assert.rejects(
      app.ready(),
      /EggPrototypeNotFound: Object doesNotExist not found in LOAD_UNIT:a/,
    );
  });
});
