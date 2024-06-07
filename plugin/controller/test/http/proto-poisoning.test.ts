import path from 'node:path';
import { strict as assert } from 'node:assert';
import mm from 'egg-mock';

describe('plugin/controller/test/http/proto-poisoning.test.ts', () => {
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
      baseDir: path.join(__dirname, '../fixtures/apps/proto-poisoning'),
      framework: require.resolve('egg'),
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
