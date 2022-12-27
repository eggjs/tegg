import mm from 'egg-mock';
import assert from 'assert';
import path from 'path';

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
    const ctx = await app.mockModuleContext();
    const baseDir = app.module.multiModuleService.configService.getBaseDir();
    assert(baseDir);
    await app.destroyModuleContext(ctx);
  });

  it('inject user should work', async () => {
    app.mockUser();
    const ctx = await app.mockModuleContext();
    const userName = app.module.multiModuleService.configService.getCurrentUserName();
    assert(userName);
    await app.destroyModuleContext(ctx);
  });

  it('custom logger should work', async () => {
    const ctx = await app.mockModuleContext();
    await app.module.multiModuleService.customLoggerService.printLog();
    await app.destroyModuleContext(ctx);
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
    await app.mockModuleContext();
    const moduleMultiModuleService1 = app.module.multiModuleService;
    const moduleMultiModuleService2 = app.module.multiModuleService;
    assert(moduleMultiModuleService1 === moduleMultiModuleService2);
  });

  it('should load egg object with no side effect', async () => {
    const ctx = await app.mockModuleContext();
    assert(ctx.counter === 0);
    assert(ctx.counter === 1);
  });
});
