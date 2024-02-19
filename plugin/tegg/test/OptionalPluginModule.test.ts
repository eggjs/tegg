import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import { UsedProto } from './fixtures/apps/plugin-module/node_modules/foo-plugin/Used';

describe('test/OptionalPluginModule.test.ts', () => {
  let app;
  const fixtureDir = path.join(__dirname, 'fixtures/apps/plugin-module');

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
    await app.mockModuleContextScope(async ctx => {
      const usedProto = await ctx.getEggObject(UsedProto);
      assert(usedProto);
    });
  });
});
