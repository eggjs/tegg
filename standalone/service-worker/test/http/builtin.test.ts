import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils';

describe('standalone/service-worker/test/http/builtin.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
    ({ app, server } = await TestUtils.createFetchApp('http-builtin'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should inject logger and log successfully', async () => {
    await httpRequest(server)
      .get('/log')
      .expect(200, { ok: true });
  });

  it('should inject httpclient', async () => {
    await httpRequest(server)
      .get('/httpclient')
      .expect(200, { hasRequest: true });
  });
});
