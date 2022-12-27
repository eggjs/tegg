import assert from 'assert';
import path from 'path';
import mm from 'egg-mock';
import { Application } from 'egg';
import AppService from '../../fixtures/apps/egg-app/modules/multi-module-service/AppService';
import PersistenceService from '../../fixtures/apps/egg-app/modules/multi-module-repo/PersistenceService';

describe('test/app/extend/application.test.ts', () => {
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
      const persistenceService = await app.getEggObject(PersistenceService);
      assert(persistenceService instanceof PersistenceService);

      await assert.rejects(() => {
        return app.getEggObject(AppService);
      }, /ctx is required/);
    });
  });
});
