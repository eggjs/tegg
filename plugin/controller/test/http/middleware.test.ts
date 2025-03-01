import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/middleware.test.ts', () => {
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

  it('global middleware should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/middleware/global')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.count, 0);
      });
  });

  it('method middleware should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/middleware/method')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.log, 'use middleware');
      });
  });

  it('method middleware call module should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .get('/middleware/methodCallModule')
      .expect(200);
  });

  it('aop controller middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/aop/middleware/global')
      .expect(200);
    assert.deepStrictEqual(res.body, {
      method: 'global',
      count: 0,
      aopList: [ 'FooControllerAdvice', 'CountAdvice' ],
    });
  });

  it('aop method middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/aop/middleware/method')
      .expect(200);
    assert.deepStrictEqual(res.body, {
      method: 'middleware',
      aopList: [
        'FooControllerAdvice',
        'CountAdvice',
        'BarMethodAdvice',
        'FooMethodAdvice',
      ],
      count: 0,
    });
  });
});
