import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/aop/test/aop.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/aop-app',
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
