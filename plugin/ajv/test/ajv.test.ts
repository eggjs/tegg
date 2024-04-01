import assert from 'node:assert';
import path from 'node:path';
import mm, { MockApplication } from 'egg-mock';

describe('plugin/ajv/test/ajv.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../');
    });
    app = mm.app({
      baseDir: path.join(__dirname, './fixtures/apps/ajv-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('should throw AjvInvalidParamError', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .post('/foo')
      .send({});
    assert.equal(res.status, 500);
    assert.match(res.text, /AjvInvalidParamError: Validation Failed/);
  });

  it('should pass', async () => {
    app.mockCsrf();
    const res = await app.httpRequest()
      .post('/foo')
      .send({
        fullname: 'fullname   ',
        skipDependencies: false,
      });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      body: {
        fullname: 'fullname',
        skipDependencies: false,
      },
    });
  });
});
