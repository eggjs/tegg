// import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('plugin/config/test/DuplicateOptionalModule.test.ts', () => {
  let app: MockApplication;
  const fixturesPath = path.join(__dirname, './fixtures/apps/duplicate-optional-module');

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
    // console.log(app.moduleReferences);
    // assert.equal(app.moduleReferences.length, 2);
  });
});
