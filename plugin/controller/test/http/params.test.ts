import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/params.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/controller-app',
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

  it('headers param should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .post('/apps')
      .set('x-session-id', 'mock-session-id')
      .send({
        name: 'foo',
        desc: 'mock-desc',
      })
      .expect(200)
      .expect(res => {
        assert.equal(res.body.success, true);
        assert(res.body.traceId);
        assert.equal(res.body.sessionId, 'mock-session-id');
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

});
