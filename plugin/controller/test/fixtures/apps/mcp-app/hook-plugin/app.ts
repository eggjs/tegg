import type { Application } from 'egg';
import { MCPControllerRegister } from '@eggjs/tegg-controller-plugin/lib/impl/mcp/MCPControllerRegister';
import { GetAlipayTeggHook } from './lib/MCPControllerHook';

export default class ControllerAppBootHook {
  #app: Application;

  constructor(app: Application) {
    this.#app = app;
  }

  configWillLoad() {
    MCPControllerRegister.addHook(GetAlipayTeggHook(this.#app));
  }
}
