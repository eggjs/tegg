import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe('test/host.test.ts', () => {
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
      baseDir: path.join(__dirname, '../fixtures/apps/host-controller-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('global host should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/1')
      .set('host', 'foo.eggjs.com')
      .expect(200)
      .expect(res => {
        console.log('res: ', res.text, res.body);
        assert(res.text === 'foo');
      });
  });

  it('method host should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/2')
      .set('host', 'bar.eggjs.com')
      .expect(200)
      .expect(res => {
        assert(res.text === 'bar');
      });
  });
});
