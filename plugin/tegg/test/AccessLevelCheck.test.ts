import assert from 'node:assert/strict';
import { mm, type MockApplication } from '@eggjs/mock';
import MainService from './fixtures/apps/access-level-check/modules/module-main/MainService.js';

describe('plugin/tegg/test/AccessLevelCheck.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/access-level-check',
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
      const mainService = await ctx.getEggObject(MainService);
      assert(mainService);
      assert.equal(mainService.invokeFoo(), 'moduleMain-FooService-Method');
    });
  });

  it('should work: public/private has some name', async () => {
    await app.mockModuleContextScope(async ctx => {
      const mainService = await ctx.getEggObject(MainService);
      assert(mainService);
      assert.equal(mainService.invokeBar(), 'moduleMain-BarService-Method');
    });
  });
});
