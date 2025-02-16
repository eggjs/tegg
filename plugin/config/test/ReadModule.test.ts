import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';
import '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('plugin/config/test/ReadModule.test.ts', () => {
  let app: MockApplication;
  const fixturesPath = path.join(__dirname, './fixtures/apps/app-with-modules');

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: fixturesPath,
    });
    await app.ready();
  });

  it('should work', async () => {
    assert.deepStrictEqual(app.moduleConfigs, {
      moduleA: {
        config: {},
        name: 'moduleA',
        reference: {
          optional: undefined,
          name: 'moduleA',
          path: path.join(fixturesPath, 'app/module-a'),
        },
      },
    });
  });

  it('should type defines work', async () => {
    assert(app.moduleConfigs);
    assert(app.moduleReferences);
  });
});
