import { InitStandaloneAppOptions, StandaloneApp, StandaloneAppInit } from './StandaloneApp';
import { Runner, RunnerOptions } from './Runner';
import type { EggContext } from '@eggjs/tegg-runtime';

export async function preLoad(cwd: string, dependencies?: RunnerOptions['dependencies']) {
  try {
    await Runner.preLoad(cwd, dependencies);
  } catch (e) {
    e.message = `[tegg/standalone] bootstrap standalone preLoad failed: ${e.message}`;
    throw e;
  }
}

export async function main<T = void>(cwd: string, options?: RunnerOptions): Promise<T> {
  const runner = new Runner(cwd, options);
  try {
    await runner.init();
  } catch (e) {
    e.message = `[tegg/standalone] bootstrap tegg failed: ${e.message}`;
    throw e;
  }
  try {
    return await runner.run<T>();
  } finally {
    runner.destroy().catch(e => {
      e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
      console.warn(e);
    });
  }
}

export async function appMain<T = void>(options: InitStandaloneAppOptions, init?: StandaloneAppInit, ctx?: EggContext): Promise<T> {
  const app = new StandaloneApp(init);
  try {
    await app.init(options);
  } catch (e) {
    e.message = `[tegg/standalone] bootstrap tegg failed: ${e.message}`;
    throw e;
  }
  try {
    return await app.run<T>(ctx);
  } finally {
    app.destroy().catch(e => {
      e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
      console.warn(e);
    });
  }
}
