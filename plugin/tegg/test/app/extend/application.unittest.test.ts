import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

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
});
