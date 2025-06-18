import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '@eggjs/tegg-service-worker';
import { TestUtils } from '../Utils';

describe('standalone/service-worker-runtime/test/http/priority.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async () => {
    ({ app, server } = await TestUtils.createFetchApp('http-priority'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should /* work', async () => {
    await httpRequest(server)
      .get('/view/foo')
      .expect(200)
      .expect('hello, view');
  });

  it('should /users/group work', async () => {
    await httpRequest(server)
      .get('/users/group')
      .expect(200)
      .expect('high priority');
  });

  it('should /users/* work', async () => {
    await httpRequest(server)
      .get('/users/foo')
      .expect(200)
      .expect('low priority');
  });
});
