import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('plugin/controller/test/http/proto-poisoning.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/proto-poisoning',
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('should protect proto poisoning', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .post('/hello-proto-poisoning')
      .set('content-type', 'application/json')
      .send(`{
        "hello": "world",
        "__proto__": { "boom": "💣" }
      }`)
      .expect(200);
    console.log(res.body);
    assert.equal(res.body['body.boom'], undefined, 'body.boom');
    assert.equal(res.body['params2.boom'], undefined, 'params2.boom');
    assert.equal(res.body['params1.boom'], undefined, 'params1.boom');
  });
});
