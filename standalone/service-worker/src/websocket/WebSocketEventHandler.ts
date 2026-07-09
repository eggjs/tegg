import { AccessLevel, Inject } from '@eggjs/tegg';
import { WebSocketUpgradeEvent } from '@eggjs/tegg-types/standalone';
import { AbstractEventHandler, EventHandlerProto } from '@eggjs/tegg/standalone';
import { RootProtoManager } from '../controller/RootProtoManager';
import { WebSocketControllerRegister } from './WebSocketControllerRegister';

@EventHandlerProto('websocket', { accessLevel: AccessLevel.PUBLIC })
export class WebSocketEventHandler extends AbstractEventHandler<WebSocketUpgradeEvent, void> {
  @Inject()
  private readonly rootProtoManager: RootProtoManager;

  #initialized = false;
  #initPromise?: Promise<void>;

  private async initRoutes() {
    if (this.#initialized) {
      return;
    }
    if (!this.#initPromise) {
      this.#initPromise = this.doInitRoutes().catch(err => {
        this.#initPromise = undefined;
        throw err;
      });
    }
    await this.#initPromise;
  }

  private async doInitRoutes() {
    WebSocketControllerRegister.instance?.doRegister(this.rootProtoManager);
    this.#initialized = true;
  }

  async handleEvent(event: WebSocketUpgradeEvent): Promise<void> {
    await this.initRoutes();
    try {
      const handled = await WebSocketControllerRegister.instance?.handleUpgrade(event);
      if (!handled) {
        WebSocketControllerRegister.rejectSocket(event.socket, 404, 'Not Found');
      }
    } catch (error) {
      console.error('handle websocket event failed:', error);
      WebSocketControllerRegister.rejectSocket(event.socket, 500, 'Internal Server Error');
    }
  }
}
