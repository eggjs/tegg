import path from 'node:path';
import { ServiceWorkerApp, ServiceWorkerAppInit } from '@eggjs/tegg-service-worker';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';

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

  static async createFetchApp(name: string, init?: ServiceWorkerAppInit) {
    const app = await TestUtils.createApp(name, init);
    const server = await StandaloneTestUtil.startHTTPServer('127.0.0.1', 7001, {
      listener: e => app.handleEvent(e),
    });

    return { app, server };
  }
}
