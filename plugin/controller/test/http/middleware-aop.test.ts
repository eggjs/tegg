import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe('plugin/controller/test/http/middleware-graph-hook.test.ts', () => {
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
      baseDir: path.join(__dirname, '../fixtures/apps/middleware-graph-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('should add module reference for class level middleware', async () => {
    assert.deepStrictEqual(app.moduleReferences.map(t => t.name), [
      'advice-module',
      'controller-module',
    ]);
  });

  it('class level middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/test/class-middleware')
      .expect(200);
    assert.deepStrictEqual(res.body, {
      message: 'class middleware',
      adviceApplied: true,
    });
  });

  it('method level middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/test/method-middleware')
      .expect(200);
    assert.deepStrictEqual(res.body, {
      message: 'method middleware',
      adviceApplied: true,
      anotherAdviceApplied: true,
    });
  });
});
