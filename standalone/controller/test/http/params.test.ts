import { Server } from 'node:http';
import { ServiceWorkerApp } from '@eggjs/tegg-service-worker';
import { TestUtils } from '../Utils';
import httpRequest from 'supertest';
import assert from 'node:assert';

describe('standalone/service-worker-runtime/test/http/params.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async () => {
    ({ app, server } = await TestUtils.createFetchApp('http-params'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should query param work', async () => {
    await httpRequest(server)
      .get('/query?name=tegg&type=1&type=2')
      .expect(200, {
        name: 'tegg',
        type: [ '1', '2' ],
      });
  });

  it('should path param work', async () => {
    await httpRequest(server)
      .get('/find/123')
      .expect(200, {
        id: '123',
      });
  });

  describe('@HTTPBody()', () => {
    it('should json body param work', async () => {
      await httpRequest(server)
        .post('/echo/body')
        .type('json')
        .send({ foo: 'bar' })
        .expect(200, { body: { foo: 'bar' } });
    });

    it('should formData body param work', async () => {
      await httpRequest(server)
        .post('/echo/body')
        .type('form')
        .send({ foo: 'bar' })
        .expect(200, { type: 'formData', body: { foo: 'bar' } });
    });

    it('should text body param work', async () => {
      await httpRequest(server)
        .post('/echo/body')
        .type('text')
        .send('hello world')
        .expect(200, { body: 'hello world' });
    });
  });

  it('should headers param work', async () => {
    const res = await httpRequest(server)
      .get('/headers')
      .set('x-custom-header', 'custom-value')
      .expect(200);
    assert.equal(res.body.headers['x-custom-header'], 'custom-value');
  });

  it('should request param work', async () => {
    await httpRequest(server)
      .post('/request')
      .set('x-custom', 'custom-value')
      .send({ foo: 'bar' })
      .expect(200, {
        url: 'http://127.0.0.1:7001/request',
        method: 'POST',
        customHeaders: 'custom-value',
        body: { foo: 'bar' },
      });
  });
});
