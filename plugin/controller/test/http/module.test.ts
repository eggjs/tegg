import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/module.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    delete (global as any).constructAppService;
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/module-app',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('controller in module should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.app, 'mock-app:foo');
      });
  });

  it('tegg controller should not construct AppService', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.app, 'mock-app:foo');
      });
    assert(!(global as any).constructAppService);
  });

  it('egg controller should construct AppService', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps2/foo')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.app, 'mock-app:foo');
      });
    assert((global as any).constructAppService);
  });
});
