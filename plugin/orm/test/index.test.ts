import assert from 'assert';
import path from 'path';
import mm, { MockApplication } from 'egg-mock';
import { AppService } from './fixtures/apps/orm-app/modules/orm-module/AppService';
import os from 'os';
import { PkgService } from './fixtures/apps/orm-app/modules/orm-module/PkgService';
import { Pkg } from './fixtures/apps/orm-app/modules/orm-module/model/Pkg';
import { App } from './fixtures/apps/orm-app/modules/orm-module/model/App';
import { CtxService } from './fixtures/apps/orm-app/modules/orm-module/CtxService';
import { EggContext } from '@eggjs/tegg';

describe('test/orm.test.ts', () => {
  // TODO win32 ci not support mysql
  if (os.platform() === 'win32') {
    return;
  }

  let app: MockApplication;
  let appService: AppService;

  afterEach(async () => {
    await Promise.all([
      Pkg.truncate(),
      App.truncate(),
    ]);
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
    const appService = await app.getEggObject(AppService);
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

  it('hook should work', async () => {
    const pkgService = await app.getEggObject(PkgService);
    const pkgModel = await pkgService.createPkg({
      name: 'egg',
      desc: 'the framework',
    });
    assert(pkgModel);
    assert(pkgModel.name === 'egg_before_create_hook');
    assert(pkgModel.desc === 'the framework');

    const findModel = await pkgService.findPkg('egg_before_create_hook');
    assert(findModel);
    assert(findModel.name === 'egg_before_create_hook');
    assert(findModel.desc === 'the framework');
  });

  it('ctx should inject with Model', async () => {
    const appService = await app.getEggObject(AppService);
    app.mockLog();
    await appService.findApp('egg');
    app.expectLog(/sql: SELECT \* FROM `apps` WHERE `name` = 'egg' LIMIT 1/);
  });

  it('singleton ORM client', async () => {
    appService = await app.getEggObject(AppService);

    describe('raw query', () => {
      before(async () => {
        const appModel = await appService.createApp({
          name: 'egg',
          desc: 'the framework',
        });
        assert(appModel);
        assert(appModel.name === 'egg');
        assert(appModel.desc === 'the framework');
      });

      it('query success', async () => {
        const res = await appService.rawQuery('test', 'select * from apps where name = "egg"');
        assert(res.rows.length === 1);
        assert(res.rows[0].name === 'egg');
      });

      it('query success for args', async () => {
        const res = await appService.rawQuery('test', 'select * from apps where name = ?', [ 'egg' ]);
        assert(res.rows.length === 1);
        assert(res.rows[0].name === 'egg');
      });
    });

    describe('multi db', () => {

      it('should work for multi database', async () => {
        const appleClient = await appService.getClient('apple');
        const bananaClient = await appService.getClient('banana');
        assert(appleClient.options.database === 'apple');
        assert(appleClient.options.database === 'apple');
        assert(bananaClient.options.database === 'banana');
        assert(bananaClient.options.database === 'banana');
      });

      it('should throw when invalid database', async () => {
        await assert.rejects(async () => {
          await appService.getClient('orange');
        }, /not found orange datasource/);
      });

      it('should return undefined when get default client', async () => {
        const defaultClient = await appService.getDefaultClient();
        assert(defaultClient === undefined);
      });
    });

  });

  describe('context proto', () => {
    let ctx: EggContext;
    let ctxService: CtxService;
    beforeEach(async () => {
      ctx = await app.mockModuleContext();
      ctxService = await ctx.getEggObject(CtxService);
    });
    afterEach(async () => {
      await app.destroyModuleContext(ctx);
    });
    it('should work for ContextProto service', async () => {
      const ctxPkg = await ctxService.createCtxPkg({
        name: 'egg',
        desc: 'the framework',
      });
      assert(ctxPkg.name === 'egg_before_create_hook');
    });

    it('should query work', async () => {
      await ctxService.createCtxPkg({
        name: 'egg',
        desc: 'the framework',
      });
      const ctxPkg = await ctxService.findCtxPkg('egg_before_create_hook');
      assert(ctxPkg);
      assert(ctxPkg.name === 'egg_before_create_hook');
    });
  });
});
