import path from 'node:path';
import { Request, RequestInfo, RequestInit } from 'undici';
import { FetchEvent } from '@eggjs/tegg-types/standalone';
import { ServiceWorkerApp, ServiceWorkerAppInit } from '../src/ServiceWorkerApp';

export class TestUtils {
  static baseDir(name: string) {
    return path.join(__dirname, 'fixtures', name);
  }

  static async createApp(name: string, init?: ServiceWorkerAppInit) {
    const app = new ServiceWorkerApp(init);
    await app.init({
      baseDir: TestUtils.baseDir(name),
      env: 'unittest',
      name,
    });

    return app;
  }

  static createFetchEvent(input: RequestInfo, init?: RequestInit): FetchEvent {
    const request = new Request(input, init);
    const event: any = new Event('fetch');
    event.request = request;

    return event;
  }
}
