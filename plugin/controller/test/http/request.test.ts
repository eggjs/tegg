import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/request.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/http-inject-app',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('Request should work', async () => {
    app.mockCsrf();
    const param = {
      name: 'foo',
      desc: 'mock-desc',
    };
    const headerKey = 'test-header';
    await app.httpRequest()
      .post('/apps/testRequest')
      .send(param)
      .set('test', headerKey)
      .set('cookie', 'test=foo')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.headers.test, headerKey);
        assert.equal(res.body.method, 'POST');
        assert.equal(res.body.requestBody, JSON.stringify(param));
        assert.equal(res.body.cookies, 'foo');
      });
  });
});
