import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';
import EggTypeService from './fixtures/apps/egg-app/modules/multi-module-service/EggTypeService';
import TraceService from './fixtures/apps/egg-app/modules/multi-module-service/TraceService';

describe('test/EggCompatible.test.ts', () => {
  let app;

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
      baseDir: path.join(__dirname, 'fixtures/apps/egg-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .post('/apps')
      .send({
        name: 'foo',
        desc: 'mock-desc',
      })
      .expect(200)
      .expect(res => {
        assert(res.body.success === true);
        assert(res.body.traceId);
      });
    await app.httpRequest()
      .get('/apps?name=foo')
      .expect(200)
      .expect(res => {
        assert(res.body.traceId);
        assert.deepStrictEqual(res.body.app, {
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('module api should work', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .post('/apps')
      .send({
        name: 'foo',
        desc: 'mock-desc',
      })
      .expect(200)
      .expect(res => {
        assert(res.body.success === true);
        assert(res.body.traceId);
      });
    await app.httpRequest()
      .get('/apps2?name=foo')
      .expect(200)
      .expect(res => {
        assert(res.body.traceId);
        assert.deepStrictEqual(res.body.app, {
          name: 'foo',
          desc: 'mock-desc',
        });
      });
  });

  it('inject config should work', async () => {
    await app.mockModuleContextScope(async () => {
      const baseDir = app.module.multiModuleService.configService.getBaseDir();
      assert(baseDir);

      const runtimeConfig = app.module.multiModuleService.configService.getRuntimeConfig();
      assert.deepEqual(runtimeConfig, {
        baseDir: path.join(__dirname, 'fixtures/apps/egg-app'),
        env: 'unittest',
        name: 'egg-app',
      });
    });
  });

  it('inject user should work', async () => {
    await app.mockModuleContextScope(async () => {
      const userName = app.module.multiModuleService.configService.getCurrentUserName();
      assert(userName);
    }, {
      user: {
        userName: 'mock_user',
      },
    });
  });

  it('custom logger should work', async () => {
    await app.mockModuleContextScope(async ctx => {
      await app.module.multiModuleService.customLoggerService.printLog();
      await app.destroyModuleContext(ctx);
    });
  });

  it('use singleton proto should work', async () => {
    await app.module.multiModuleRepo.globalAppRepo.insertApp({
      name: 'foo',
      desc: 'desc',
    });
    const appInfo = await app.module.multiModuleRepo.globalAppRepo.findApp('foo');
    assert.deepStrictEqual(appInfo, {
      name: 'foo',
      desc: 'desc',
    });
  });

  it('module proxy cache should work', async () => {
    await app.mockModuleContextScope(async () => {
      const moduleMultiModuleService1 = app.module.multiModuleService;
      const moduleMultiModuleService2 = app.module.multiModuleService;
      assert(moduleMultiModuleService1 === moduleMultiModuleService2);
    });
  });

  it('should load egg object with no side effect', async () => {
    await app.mockModuleContextScope(async ctx => {
      assert(ctx.counter === 0);
      assert(ctx.counter === 1);
    });
  });

  it('should support EggQualifier', async () => {
    await app.mockModuleContextScope(async () => {
      const eggTypeService = await app.getEggObject(EggTypeService);
      const result = eggTypeService.testInject();
      assert.deepStrictEqual(result, { app: { from: 'app' }, ctx: { from: 'ctx' } });
    });
  });

  it('should support context property', async () => {
    mm(app.context, 'tracer', {
      traceId: 'mockTraceId',
    });
    await app.mockModuleContextScope(async () => {
      const traceService: TraceService = await app.getEggObject(TraceService);
      assert(traceService.getTraceId() === 'mockTraceId');
    });
    mm(app.context, 'tracer', {
      traceId: 'mockTraceId2',
    });
    await app.mockModuleContextScope(async () => {
      const traceService: TraceService = await app.getEggObject(TraceService);
      console.log('id: ', traceService.getTraceId());
      assert(traceService.getTraceId() === 'mockTraceId2');
    });
  });
});
