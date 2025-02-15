import mm from 'egg-mock';
import assert from 'node:assert/strict';
import path from 'node:path';

describe('plugin/config/test/DuplicateOptionalModule.test.ts', () => {
  let app;
  const fixturesPath = path.join(__dirname, './fixtures/apps/duplicate-optional-module');

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
    assert.equal(app.moduleReferences.length, 2);
  });
});
