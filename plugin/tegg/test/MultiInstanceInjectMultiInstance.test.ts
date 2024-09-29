import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';
import { App2 } from './fixtures/apps/app-multi-inject-multi/app/modules/app2/App';
import { App } from './fixtures/apps/app-multi-inject-multi/app/modules/app/App';

describe('plugin/tegg/test/MultiInstanceInjectMultiInstance.test.ts', () => {
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
      baseDir: path.join(__dirname, 'fixtures/apps/app-multi-inject-multi'),
      framework: require.resolve('egg'),
    });
    await app.ready();
  });

  it('dynamic inject should work', async () => {
    const app2Instance: App2 = await app.getEggObject(App2);
    const appInstance: App = await app.getEggObject(App);
    const app2Secret = app2Instance.secret.getSecret('mock');
    const appName = appInstance.bizManager.name;
    const appSecret = appInstance.bizManager.secret;

    assert.equal(app2Secret, 'mock233');
    assert.equal(appName, 'foo');
    assert.equal(appSecret, 'foo233');
  });
});
