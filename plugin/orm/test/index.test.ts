import assert from 'assert';
import path from 'path';
import mm from 'egg-mock';
import { AppService } from './fixtures/apps/orm-app/modules/orm-module/AppService';
import os from 'os';

describe('test/orm.test.ts', () => {
  // TODO win32 ci not support mysql
  if (os.platform() === 'win32') {
    return;
  }

  let app;
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
      baseDir: path.join(__dirname, './fixtures/apps/orm-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('bone should work', async () => {
    ctx = await app.mockModuleContext();
    const appService = await ctx.getEggObject(AppService);
    const appModel = await appService.createApp({
      name: 'egg',
      desc: 'the framework',
    });
    assert(appModel);
    assert(appModel.name === 'egg');
    assert(appModel.desc === 'the framework');

    const findModel = await appService.findApp('egg');
    assert(findModel);
    assert(findModel.name === 'egg');
    assert(findModel.desc === 'the framework');
  });
});
