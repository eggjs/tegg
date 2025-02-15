import mm from 'egg-mock';
import path from 'node:path';
import assert from 'node:assert/strict';

describe('plugin/aop/test/aop.test.ts', () => {
  let app;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/aop-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('module aop should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/aop')
      .expect(200);
    assert.deepStrictEqual(res.body, {
      msg: 'withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(foo))))',
    });
  });

  it('module aop should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/singletonAop')
      .expect(200);
    assert.deepStrictEqual(res.body, {
      msg: 'withContextPointAroundResult(hello withContextPointAroundParam(foo))',
    });
  });
});
