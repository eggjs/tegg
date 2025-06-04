import path from 'node:path';
import { ServiceWorkerApp } from '../src/ServiceWorkerApp';

describe('http', () => {
  it('should get work', async () => {
    const fixture = path.join(__dirname, './fixtures/get-app');
    const app = new ServiceWorkerApp();
    await app.init({
      baseDir: fixture,
      env: 'dev',
      name: 'getApp',
    });

    const request = new Request('http://127.0.0.1/echo?name=foo', { method: 'GET' });
    const e: any = new Event('fetch');
    e.request = request;

    const res: any = await app.handleEvent(e);
    console.log(res, await res.json());
  });
});
