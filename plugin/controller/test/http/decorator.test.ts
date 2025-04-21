import path from 'node:path';
import mm from 'egg-mock';

describe('plugin/controller/test/http/decorator.test.ts', () => {
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

  it('should timeout for method timeout', async () => {
    await app.httpRequest()
      .get('/timeout-1')
      .expect(500);
  });

  it('should not timeout', async () => {
    await app.httpRequest()
      .get('/timeout-2')
      .expect(200, 'success');
  });

  it('should timeout for controller timeout', async () => {
    await app.httpRequest()
      .get('/timeout-3')
      .expect(500);
  });
});
