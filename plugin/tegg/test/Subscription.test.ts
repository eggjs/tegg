import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import AppService from './fixtures/apps/schedule-app/modules/multi-module-service/AppService';

describe('plugin/tegg/test/Subscription.test.ts', () => {
  let app;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/schedule-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('should work', async () => {
    let called = false;
    mm(AppService.prototype, 'findApp', () => {
      called = true;
    });
    await app.runSchedule('foo');
    assert(called);
  });
});
