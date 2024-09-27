import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';

describe('plugin/tegg/test/ModuleConfig.test.ts', () => {
  let app;
  const fixtureDir = path.join(__dirname, 'fixtures/apps/constructor-module-config');

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
      baseDir: fixtureDir,
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('should work', async () => {
    await app.httpRequest()
      .get('/config')
      .expect(200)
      .expect(res => {
        assert.deepStrictEqual(res.body, {
          foo: 'bar',
          bar: 'foo',
        });
      });
  });
});
