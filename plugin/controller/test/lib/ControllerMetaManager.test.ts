import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe('test/ControllerMetaManager.test.ts', () => {
  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
  });

  afterEach(() => {
    mm.restore();
  });

  describe('controllers have same controller name', () => {
    it('should throw error', async () => {
      let app;
      mm(process, 'cwd', () => {
        return path.join(__dirname, '../..');
      });
      await assert.rejects(async () => {
        app = mm.app({
          baseDir: path.join(__dirname, '../fixtures/apps/duplicate-controller-name-app'),
          framework: require.resolve('egg'),
        });
        await app.ready();
      }, /duplicate controller name AppController/);
      await app.close();
    });
  });

  describe('controllers have same proto name', () => {
    it('should throw error', async () => {
      let app;
      mm(process, 'cwd', () => {
        return path.join(__dirname, '../..');
      });
      await assert.rejects(async () => {
        app = mm.app({
          baseDir: path.join(__dirname, '../fixtures/apps/duplicate-proto-name-app'),
          framework: require.resolve('egg'),
        });
        await app.ready();
      }, /duplicate proto name appController/);
      await app.close();
    });
  });
});
