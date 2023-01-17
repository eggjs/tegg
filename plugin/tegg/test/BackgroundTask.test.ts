import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import { CountService } from './fixtures/apps/background-app/modules/multi-module-background/CountService';
import sleep from 'mz-modules/sleep';

describe('test/BackgroundTask.test.ts', () => {
  const appDir = path.join(__dirname, 'fixtures/apps/background-app');
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
      baseDir: appDir,
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('background task should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/background')
      .expect(200);

    const countService = await app.getEggObject(CountService);
    assert(countService.count === 0);
    await sleep(1000);
    assert(countService.count === 1);
  });

  it('background timeout with humanize error info', async () => {
    app.mockLog();
    app.mockCsrf();
    await app.httpRequest()
      .get('/backgroudTimeout')
      .expect(200);

    await sleep(7000);
    app.expectLog('Can not read property `testObj` because egg ctx has been destroyed [');
  });
});
