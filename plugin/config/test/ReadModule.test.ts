import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';

describe('test/ReadModule.test.ts', () => {
  let app;
  const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-modules');

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
      baseDir: fixturesPath,
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('should work', async () => {
    assert.deepStrictEqual(app.moduleConfigs, {
      moduleA: {
        config: {},
        name: 'moduleA',
        reference: {
          optional: undefined,
          name: 'moduleA',
          path: path.join(fixturesPath, 'app/module-a'),
        },
      },
    });
  });
});
