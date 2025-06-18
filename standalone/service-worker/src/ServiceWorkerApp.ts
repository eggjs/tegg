import path from 'node:path';
import { StandaloneApp, StandaloneAppInit, StandaloneContext } from '@eggjs/tegg-standalone';
import { ContextProtoProperty } from '@eggjs/tegg-service-worker-runtime';

export type ServiceWorkerAppInit = Omit<StandaloneAppInit, 'frameworkDeps'>;

export class ServiceWorkerApp extends StandaloneApp {
  constructor(init?: ServiceWorkerAppInit) {
    const opts: StandaloneAppInit = {
      ...init,
      frameworkDeps: [{ baseDir: path.join(__dirname, '..'), extraFilePattern: [ '!**/test' ] }],
    };
    super(opts);
  }

  async handleEvent<T = unknown>(event: Event) {
    const context = new StandaloneContext();
    context.set(ContextProtoProperty.Event.contextKey, event);

    return await this.run<T>(context);
  }
}
