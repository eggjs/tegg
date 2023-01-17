import assert from 'assert';
import path from 'path';
import mm from 'egg-mock';
import { Application } from 'egg';
import AppService from '../../fixtures/apps/egg-app/modules/multi-module-service/AppService';
import PersistenceService from '../../fixtures/apps/egg-app/modules/multi-module-repo/PersistenceService';

describe('test/app/extend/context.test.ts', () => {
  let app: Application;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../../../');
    });
    app = mm.app({
      baseDir: path.join(__dirname, '../../fixtures/apps/egg-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  describe('getEggObject', () => {
    it('should work', async () => {
      await app.mockModuleContextScope(async ctx => {
        const appService = await ctx.getEggObject(AppService);
        assert(appService instanceof AppService);

        const persistenceService = await ctx.getEggObject(PersistenceService);
        assert(persistenceService instanceof PersistenceService);
      });
    });
  });

  describe('beginModuleScope', () => {
    it('should work', async () => {
      const ctx = app.createAnonymousContext();
      await assert.doesNotThrow(async () => {
        await ctx.beginModuleScope(async () => {
          const appService = await ctx.getEggObject(AppService);
          assert(appService instanceof AppService);
        });
      });
    });
  });
});
