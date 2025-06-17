import { ServiceWorkerApp } from '@eggjs/tegg-service-worker';
import { Server } from 'node:http';
import { TestUtils } from '../Utils';
import httpRequest from 'supertest';

describe('standalone/service-worker-runtime/test/http/response.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async () => {
    ({ app, server } = await TestUtils.createFetchApp('http'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should return Response work', async () => {
    await httpRequest(server)
      .get('/api/response')
      .expect(500, 'full response')
      .expect('Content-Type', 'text/plain')
      .expect('x-custom-header', 'custom-value');
  });

  it('should return 204 with no content', async () => {
    await httpRequest(server)
      .get('/api/null-body')
      .expect(204, '');

    await httpRequest(server)
      .get('/api/null-body?nil=1')
      .expect(204, '');
  });
});
