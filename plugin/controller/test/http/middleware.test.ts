import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe('test/middleware.test.ts', () => {
  let app;

  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, '../fixtures/apps/controller-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('global middleware should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/middleware/global')
      .expect(200)
      .expect(res => {
        assert(res.body.count === 0);
      });
  });

  it('method middleware should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/middleware/method')
      .expect(200)
      .expect(res => {
        assert(res.body.log === 'use middleware');
      });
  });

  it('method middleware call module should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/middleware/methodCallModule')
      .expect(200);
  });
});
