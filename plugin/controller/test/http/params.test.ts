import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe('test/params.test.ts', () => {
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

  it('body param should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .post('/apps')
      .send({
        name: 'foo',
        desc: 'mock-desc',
      })
      .expect(200)
      .expect(res => {
        assert(res.body.success === true);
        assert(res.body.traceId);
      });
  });

  it('query param should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps?name=foo')
      .expect(200)
      .expect(res => {
        assert(res.body.traceId);
        assert.deepStrictEqual(res.body.app, {
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('path param should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        assert(res.body.traceId);
        assert.deepStrictEqual(res.body.app, {
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('global middleware should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        assert(res.body.traceId);
        assert.deepStrictEqual(res.body.app, {
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('controller path param should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/foo/fooId/bar/barId')
      .expect(200)
      .expect(res => {
        assert.deepStrictEqual(res.body, {
          fooId: 'fooId',
          barId: 'barId',
        });
      });
  });

  it('InjectHTTPRequest should work', async () => {
    app.mockCsrf();
    const param = {
      name: 'foo',
      desc: 'mock-desc',
    };
    const headerKey = 'test-header';
    await app.httpRequest()
      .post('/apps')
      .send(param)
      .set('test', headerKey)
      .expect(200)
      .expect(res => {
        assert(res.body.headers.test === headerKey);
        assert(res.body.method === 'POST');
        assert(res.body.requestBody === JSON.stringify(param));
      });
  });
});
