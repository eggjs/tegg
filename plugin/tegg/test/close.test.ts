import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';

describe('plugin/tegg/test/close.test.ts', () => {
  it('should clean lifecycle hooks', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    const app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/schedule-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
    await app.close();

    assert.equal(app.loadUnitLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.loadUnitInstanceLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.eggContextLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.eggPrototypeLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.eggObjectLifecycleUtil.getLifecycleList().length, 0);
  });
});
