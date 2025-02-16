import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it, afterAll, afterEach, beforeAll } from 'vitest';
import { mm, MockApplication } from '@eggjs/mock';
// import '../index.js';
import MainService from './fixtures/apps/access-level-check/modules/module-main/MainService.js';

describe('plugin/tegg/test/AccessLevelCheck.test.ts', () => {
  let app: MockApplication;
  const fixtureDir = path.join(__dirname, 'fixtures/apps/access-level-check');

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    mm.restore();
  });

  beforeAll(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: fixtureDir,
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('invoke moduleMain fooService method', async () => {
    await app.httpRequest()
      .get('/invokeFoo')
      .expect(200)
      .expect(ret => {
        assert(ret.body.ret, 'moduleMain-FooService-Method');
      });
  });

  it('should work: private has some name', async () => {
    await app.mockModuleContextScope(async ctx => {
      const mainService: MainService = await ctx.getEggObject(MainService);
      assert(mainService);
      assert(mainService.invokeFoo() === 'moduleMain-FooService-Method');
    });
  });

  it('should work: public/private has some name', async () => {
    await app.mockModuleContextScope(async ctx => {
      const mainService: MainService = await ctx.getEggObject(MainService);
      assert(mainService);
      assert(mainService.invokeBar() === 'moduleMain-BarService-Method');
    });
  });
});
