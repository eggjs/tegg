import { FetchEvent } from '@eggjs/tegg-types/standalone';
import { AccessLevel, Inject, InjectOptional, LifecycleInit, LifecyclePostInject, Logger } from '@eggjs/tegg';
import { AbstractEventHandler, EventHandlerProto } from '@eggjs/tegg/standalone';
import { MiddlewareFuncWithRouter } from '@eggjs/router/src/types';
import { FetchRouter } from './FetchRouter';
import { ServiceWorkerFetchContext } from './ServiceWorkerFetchContext';
import { RootProtoManager } from '../../RootProtoManager';
import { HTTPControllerRegister } from './HTTPControllerRegister';

@EventHandlerProto('fetch', { accessLevel: AccessLevel.PUBLIC })
export class FetchEventHandler extends AbstractEventHandler<FetchEvent, Response> {
  @InjectOptional()
  private readonly coreLogger?: Logger;

  @Inject()
  private readonly fetchRouter: FetchRouter;

  @Inject()
  private readonly rootProtoManager: RootProtoManager;

  #routes: MiddlewareFuncWithRouter<FetchRouter>;

  @LifecyclePostInject()
  initRoutes() {
    this.#routes = this.fetchRouter.middleware();
  }

  @LifecycleInit()
  doRegister() {
    HTTPControllerRegister.instance?.doRegister(this.rootProtoManager);
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    const ctx = new ServiceWorkerFetchContext({ event });
    try {
      await this.#routes(ctx, async () => { /**/ });
      if (ctx.response) {
        return ctx.response;
      }

      return new Response(null, { status: 404 });
    } catch (e) {
      this.coreLogger?.error('handle event failed:', e);
      return new Response(e.message, { status: 500 });
    }
  }
}
