import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import { CountService } from './fixtures/apps/background-app/modules/multi-module-background/CountService';
import sleep from 'mz-modules/sleep';

describe('test/BackgroundTask.test.ts', () => {
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
      baseDir: path.join(__dirname, 'fixtures/apps/background-app'),
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
});
