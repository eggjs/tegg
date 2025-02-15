import assert from 'node:assert/strict';
import path from 'node:path';
import mm from 'egg-mock';
import { Foo } from './fixtures/apps/constructor-module-config/modules/module-with-config/foo';

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

  it('construct proxy should work', async () => {
    const foo: Foo = await app.getEggObject(Foo);
    foo.log();
  });
});
