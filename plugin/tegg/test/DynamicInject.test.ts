import assert from 'node:assert/strict';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/tegg/test/DynamicInject.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/dynamic-inject-app',
    });
    await app.ready();
  });

  it('dynamic inject should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/dynamicInject')
      .expect(200);
    assert.deepStrictEqual(res.body, [
      'hello, foo(context:0)',
      'hello, bar(context:0)',
      'hello, foo(singleton:0)',
      'hello, bar(singleton:0)',
    ]);
  });

  it('singleton dynamic inject should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .get('/singletonDynamicInject')
      .expect(200);
    assert.deepStrictEqual(res.body, [
      'hello, foo(singleton:1)',
      'hello, bar(singleton:1)',
    ]);
  });
});
