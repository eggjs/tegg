import assert from 'assert';
import path from 'path';
import mm, { MockApplication } from 'egg-mock';
import os from 'os';
import { DBService } from './fixtures/apps/multi-db-app/modules/multi-db-app/DBService';

// mm.app 多实例报错
describe.skip('test/multi.test.ts', () => {
  // TODO win32 ci not support mysql
  if (os.platform() === 'win32') {
    return;
  }

  let app: MockApplication;
  let dbService: DBService;
  let ctx;

  afterEach(async () => {
    await app.destroyModuleContext(ctx);
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '../');
    });
    app = mm.app({
      baseDir: path.join(__dirname, './fixtures/apps/multi-db-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  beforeEach(async () => {
    ctx = await app.mockModuleContext();
    dbService = await ctx.getEggObject(DBService);
  });

  after(() => {
    return app.close();
  });

  it('should work for multi database', async () => {
    const appleClient = await dbService.getClient('apple');
    const bananaClient = await dbService.getClient('banana');
    assert(appleClient.options.database === 'apple');
    assert(appleClient.options.database === 'apple');
    assert(bananaClient.options.database === 'banana');
    assert(bananaClient.options.database === 'banana');
  });

  it('should throw when invalid database', async () => {
    await assert.rejects(async () => {
      await dbService.getClient('orange');
    }, /not found datasource for orange/);
  });
});
