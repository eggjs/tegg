import mm from 'egg-mock';
import path from 'path';

describe('test/edgecase.test.ts', () => {
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

  it('redirect should work', async () => {
    await app.httpRequest()
      .get('/redirect')
      .expectHeader('location')
      .expect(302);
  });

  it('empty should work', async () => {
    await app.httpRequest()
      .get('/empty')
      .expect(204);
  });
});
