import path from 'node:path';
import { StandaloneApp, StandaloneAppInit, StandaloneContext } from '@eggjs/tegg-standalone';
import { ContextProtoProperty } from '@eggjs/tegg-service-worker-runtime';

export type ServiceWorkerAppInit = Omit<StandaloneAppInit, 'frameworkPath'>;

export class ServiceWorkerApp extends StandaloneApp {
  constructor(init?: ServiceWorkerAppInit) {
    const opts = {
      ...init,
      frameworkPath: path.join(__dirname, '..'),
    };
    super(opts);
  }

  // TODO: type
  async handleEvent(event: any) {
    const context = new StandaloneContext();
    context.set(ContextProtoProperty.Event.contextKey, event);

    return await this.run(context);
  }
}
