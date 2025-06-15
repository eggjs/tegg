import fs from 'node:fs/promises';
import path from 'node:path';
import { StandaloneApp, StandaloneAppInit } from '../src/StandaloneApp';

export class StandAloneAppTest {
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      return !!await fs.stat(filePath);
    } catch (err: any) {
      return false;
    }
  }

  static async copyFixture(name: string) {
    const tmpPath = await StandAloneAppTest.emptyFixtureTmp();
    const fixturePath = path.join(__dirname, 'fixtures', name);
    const targetFixturePath = path.join(tmpPath, name);
    await fs.cp(fixturePath, targetFixturePath, { recursive: true });
    return targetFixturePath;
  }

  static async emptyFixtureTmp() {
    const tmpPath = await StandAloneAppTest.removeFixtureTmp();
    await fs.mkdir(tmpPath);
    return tmpPath;
  }

  static async removeFixtureTmp() {
    const tmpPath = path.join(__dirname, 'fixtures', 'tmp');
    if (await StandAloneAppTest.fileExists(tmpPath)) {
      await fs.rm(tmpPath, { recursive: true, force: true });
    }
    return tmpPath;
  }

  static baseDir(name: string) {
    return path.join(__dirname, 'fixtures', 'tmp', name);
  }

  static initOpts(name: string, env?: string) {
    return {
      baseDir: StandAloneAppTest.baseDir(name),
      env,
      name,
    };
  }

  static async createApp(name: string, init?: StandaloneAppInit): Promise<StandaloneApp>;
  static async createApp(name: string, env?: string, init?: StandaloneAppInit): Promise<StandaloneApp>;
  static async createApp(name: string, envOrInit?: StandaloneAppInit | string, init?: StandaloneAppInit): Promise<StandaloneApp> {
    if (typeof envOrInit === 'string') {
      const app = new StandaloneApp(init);
      await app.init(StandAloneAppTest.initOpts(name, envOrInit));
      return app;
    }
    const app = new StandaloneApp(envOrInit);
    try {
      await app.init(StandAloneAppTest.initOpts(name));
    } catch (e) {
      await app.destroy().catch(e => {
        e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
        console.warn(e);
      });
      throw e;
    }
    return app;
  }

  static async run<T = void>(name: string, init?: StandaloneAppInit): Promise<T>;
  static async run<T = void>(name: string, env?: string, init?: StandaloneAppInit): Promise<T>;
  static async run<T = void>(name: string, env?: StandaloneAppInit | string, init?: StandaloneAppInit): Promise<T> {
    await StandAloneAppTest.copyFixture(name);

    const app = typeof env === 'string'
      ? await StandAloneAppTest.createApp(name, env, init)
      : await StandAloneAppTest.createApp(name, env);
    try {
      return await app.run<T>();
    } finally {
      await app.destroy().catch(e => {
        e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
        console.warn(e);
      });
    }
  }
}
