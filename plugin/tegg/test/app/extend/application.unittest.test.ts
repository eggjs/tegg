import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/app/extend/application.unittest.test.ts', () => {
  let app: MockApplication;

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
    });
    await app.ready();
  });

  it('should work', async () => {
    await app.mockModuleContextScope(async () => {
      const traceId = await (app.module as any).multiModuleService.traceService.getTraceId();
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
