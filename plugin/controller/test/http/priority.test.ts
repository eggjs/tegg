import mm from 'egg-mock';
import path from 'path';

describe('test/priority.test.ts', () => {
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

  it('/* should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/view/foo')
      .expect(200)
      .expect('hello, view');
  });

  it('/users/group', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/users/group')
      .expect(200)
      .expect('high priority');
  });

  it('/users/* should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/users/foo')
      .expect(200)
      .expect('low priority');
  });
});
