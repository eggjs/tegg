import mm from 'egg-mock';
import path from 'node:path';
import assert from 'node:assert/strict';

describe('plugin/controller/test/http/module.test.ts', () => {
  let app;

  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
  });

  afterEach(() => {
    mm.restore();
    delete (global as any).constructAppService;
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, '../fixtures/apps/module-app'),
      framework: require.resolve('egg'),
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
        assert(res.body.app === 'mock-app:foo');
      });
  });

  it('tegg controller should not construct AppService', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        assert(res.body.app === 'mock-app:foo');
      });
    assert(!(global as any).constructAppService);
  });

  it('egg controller should construct AppService', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/apps2/foo')
      .expect(200)
      .expect(res => {
        assert(res.body.app === 'mock-app:foo');
      });
    assert((global as any).constructAppService);
  });
});
