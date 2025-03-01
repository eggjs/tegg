import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/lib/ControllerMetaManager.test.ts', () => {
  afterEach(() => {
    return mm.restore();
  });

  describe('controllers have same controller name', () => {
    it('should throw error', async () => {
      let app: MockApplication;
      await assert.rejects(async () => {
        app = mm.app({
          baseDir: 'apps/duplicate-controller-name-app',
        });
        await app.ready();
      }, /duplicate controller name AppController/);
      await app!.close();
    });
  });

  describe('controllers have same proto name', () => {
    it('should throw error', async () => {
      let app: MockApplication;
      await assert.rejects(async () => {
        app = mm.app({
          baseDir: 'apps/duplicate-proto-name-app',
        });
        await app.ready();
      }, /duplicate proto name appController/);
      await app!.close();
    });
  });
});
