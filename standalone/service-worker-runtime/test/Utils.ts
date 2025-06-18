import path from 'node:path';
import { StandaloneApp, StandaloneAppInit, StandaloneContext } from '@eggjs/tegg-standalone';
import { ContextProtoProperty } from '../src/constants';

export class StandAloneAppTest {
  static baseDir(name: string) {
    return path.join(__dirname, 'fixtures', name);
  }

  static async run<T = void>(name: string, event: any, init?: StandaloneAppInit): Promise<T> {
    const app = new StandaloneApp({
      frameworkDeps: [
        path.dirname(require.resolve('@eggjs/tegg-dynamic-inject-runtime/package.json')),
        { baseDir: path.join(__dirname, '..'), extraFilePattern: [ '!**/test' ] },
      ],
      ...init,
    });
    try {
      await app.init({
        baseDir: StandAloneAppTest.baseDir(name),
        env: 'unittest',
        name,
      });

      const ctx = new StandaloneContext();
      ctx.set(ContextProtoProperty.Event.contextKey, event);
      return await app.run<T>(ctx);
    } finally {
      await app.destroy().catch(e => {
        e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
        console.warn(e);
      });
    }
  }
}
