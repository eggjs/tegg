import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '@eggjs/tegg-service-worker';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils';

describe('standalone/controller/test/http/router.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
    ({ app, server } = await TestUtils.createFetchApp('http'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should get work', async () => {
    await httpRequest(server)
      .get('/hello')
      .expect(200, 'hello');
  });

  it('should post work', async () => {
    await httpRequest(server)
      .post('/echo')
      .send({ name: 'tegg' })
      .expect(200, {
        success: true,
        data: { name: 'tegg' },
      });
  });

  it('should return 404 with invalid path', async () => {
    await httpRequest(server)
      .get('/invalid-path')
      .expect(404);
  });
});
