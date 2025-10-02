import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import AppService from '../../fixtures/apps/egg-app/modules/multi-module-service/AppService.js';
import PersistenceService from '../../fixtures/apps/egg-app/modules/multi-module-repo/PersistenceService.js';

import { getAppBaseDir } from '../../utils.js';

describe('test/app/extend/application.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(async () => {
    await mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('egg-app'),
    });
    await app.ready();
  });

  describe('getEggObject', () => {
    it('should work', async () => {
      const persistenceService = await app.getEggObject(PersistenceService);
      assert(persistenceService);
      assert(persistenceService instanceof PersistenceService);

      await assert.rejects(() => {
        return app.getEggObject(AppService);
      }, /ctx is required/);
    });
  });
});
