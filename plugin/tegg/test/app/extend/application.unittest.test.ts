import assert from 'node:assert/strict';
import path from 'node:path';
import mm from 'egg-mock';

describe('test/app/extend/application.unittest.test.ts', () => {
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
      return path.join(__dirname, '../../../');
    });
    app = mm.app({
      baseDir: path.join(__dirname, '../../fixtures/apps/egg-app'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('should work', async function() {
    await app.mockModuleContextScope(async () => {
      const traceId = await app.module.multiModuleService.traceService.getTraceId();
      assert(traceId);
    });
  });

  it('should not call mockModuleContext twice', async () => {
    const ctx = await app.mockModuleContext();
    try {
      await assert.rejects(
        app.mockModuleContext(),
        /should not call mockModuleContext twice./,
      );
    } finally {
      await app.destroyModuleContext(ctx);
    }
  });
});
