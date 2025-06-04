import { InitStandaloneAppOptions, StandaloneApp, StandaloneAppInit } from './StandaloneApp';

export async function main<T = void>(options: InitStandaloneAppOptions, init?: StandaloneAppInit): Promise<T> {
  const app = new StandaloneApp(init);
  try {
    await app.init(options);
  } catch (e) {
    e.message = `[tegg/standalone] bootstrap tegg failed: ${e.message}`;
    throw e;
  }
  try {
    return await app.run<T>();
  } finally {
    app.destroy().catch(e => {
      e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
      console.warn(e);
    });
  }
}
