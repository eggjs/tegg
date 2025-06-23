import { strict as assert } from 'node:assert';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { ServiceWorkerApp } from '../src/ServiceWorkerApp';
import { TestUtils } from './Utils';

describe('standalone/service-worker/test/http.test.ts', () => {
  let app: ServiceWorkerApp;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
  });

  afterEach(async () => {
    await app?.destroy();
  });

  it('should get work', async () => {
    app = await TestUtils.createApp('http');

    const event = TestUtils.createFetchEvent('http://127.0.0.1/echo?name=foo', { method: 'GET' });

    const res: Response = await app.handleEvent(event);
    assert.deepEqual(await res.json(), {
      success: true,
      message: 'hello foo',
    });
  });
});
