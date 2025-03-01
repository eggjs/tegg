import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ControllerMetadataUtil } from '@eggjs/tegg';
import { EggControllerLoader } from '../../lib/EggControllerLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('plugin/controller/test/lib/EggModuleLoader.test.ts', () => {
  it('should work', async () => {
    const controllerDir = path.join(__dirname, '../fixtures/apps/controller-app/app/controller');
    const loader = new EggControllerLoader(controllerDir);
    const classes = await loader.load();
    assert.equal(classes.length, 7);
    const AppController = classes[0];
    const metadata = ControllerMetadataUtil.getControllerMetadata(AppController);
    assert(metadata);
  });
});
