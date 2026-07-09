import { Server } from 'node:http';
import assert from 'node:assert';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils';

describe('standalone/service-worker/test/http/response.test.ts', () => {
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

  it('should return SSE stream response', async () => {
    const res = await httpRequest(server)
      .get('/api/sse?id=standalone')
      .expect(200)
      .expect('Cache-Control', 'no-cache')
      .expect('Connection', 'keep-alive');

    assert.equal(res.headers['content-type'], 'text/event-stream');
    assert.equal(res.text, [
      'event: ready',
      'data: {"id":"standalone"}',
      '',
      'event: done',
      'data: ok',
      '',
      '',
    ].join('\n'));
  });
});
