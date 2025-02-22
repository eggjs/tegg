import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';
import AppService from '../../fixtures/apps/egg-app/modules/multi-module-service/AppService.js';
import PersistenceService from '../../fixtures/apps/egg-app/modules/multi-module-repo/PersistenceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/app/extend/application.test.ts', () => {
  let app: MockApplication;

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
