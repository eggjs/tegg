import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/edgecase.test.ts', () => {
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

  it('redirect should work', async () => {
    await app.httpRequest()
      .get('/redirect')
      .expect('location', 'https://alipay.com/')
      .expect(302);
  });

  it('empty should work', async () => {
    await app.httpRequest()
      .get('/empty')
      .expect(204);
  });

  it('should case sensitive', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/Middleware/Method')
      .expect(200)
      .expect(res => {
        assert(res.text === 'hello, view');
      });
  });
});
