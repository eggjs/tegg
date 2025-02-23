import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('plugin/tegg/test/NoModuleJson.test.ts', () => {
  let app: MockApplication;
  const fixtureDir = path.join(__dirname, 'fixtures/apps/app-with-no-module-json');

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/app-with-no-module-json',
    });
    await app.ready();
  });

  it('should work', async () => {
    await app.httpRequest()
      .get('/config')
      .expect(200)
      .expect(res => {
        const baseDir = res.body.baseDir;
        assert.equal(baseDir, fixtureDir);
      });
  });
});
