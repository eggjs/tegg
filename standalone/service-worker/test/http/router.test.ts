import assert from 'node:assert';
import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp';
import { FetchEvent } from '@eggjs/tegg-types/standalone';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils';
import { httpAdviceExecutionLog } from '../fixtures/http/HttpTestAdvice';
import { HTTPControllerRegister } from '../../src/http/HTTPControllerRegister';

describe('standalone/service-worker/test/http/router.test.ts', () => {
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

  it('should initialize routes once under concurrent fetch events', async () => {
    const doRegister = HTTPControllerRegister.prototype.doRegister;
    let registerCount = 0;
    HTTPControllerRegister.prototype.doRegister = function(...args) {
      registerCount++;
      return doRegister.apply(this, args);
    };

    try {
      const createEvent = (): FetchEvent => ({
        type: 'fetch',
        request: new Request('http://127.0.0.1/hello', { method: 'GET' }),
        waitUntil() { /**/ },
        respondWith() { /**/ },
      } as unknown as FetchEvent);

      const [ responseA, responseB ] = await Promise.all([
        app.handleEvent<Response>(createEvent()),
        app.handleEvent<Response>(createEvent()),
      ]);

      assert.strictEqual(registerCount, 1);
      assert.strictEqual(responseA.status, 200);
      assert.strictEqual(responseB.status, 200);
      assert.strictEqual(await responseA.text(), 'hello');
      assert.strictEqual(await responseB.text(), 'hello');
    } finally {
      HTTPControllerRegister.prototype.doRegister = doRegister;
    }
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

  it('should execute AOP middleware for HTTP controller', async () => {
    httpAdviceExecutionLog.length = 0;

    await httpRequest(server)
      .get('/middleware/aop')
      .expect(200, { msg: 'hello' });

    assert(httpAdviceExecutionLog.length > 0, 'middleware should have been executed');
    assert(httpAdviceExecutionLog.includes('before'), 'middleware before should have been called');
    assert(httpAdviceExecutionLog.includes('after'), 'middleware after should have been called');
  });
});
