import './lib/AppLoadUnit';
import './lib/AppLoadUnitInstance';
import './lib/EggCompatibleObject';
import { Application } from 'egg';
import { EggContextCompatibleHook } from './lib/EggContextCompatibleHook';
import { CompatibleUtil } from './lib/CompatibleUtil';
import { ModuleHandler } from './lib/ModuleHandler';

export default class App {
  private readonly app: Application;
  private compatibleHook?: EggContextCompatibleHook;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    this.app.config.coreMiddleware.push('teggCtxLifecycleMiddleware');
  }

  configDidLoad() {
    this.app.moduleHandler = new ModuleHandler(this.app);
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
    this.compatibleHook = new EggContextCompatibleHook(this.app.moduleHandler);
    this.app.eggContextLifecycleUtil.registerLifecycle(this.compatibleHook);
  }

  async beforeClose() {
    CompatibleUtil.clean();
    await this.app.moduleHandler.destroy();
    if (this.compatibleHook) {
      this.app.eggContextLifecycleUtil.deleteLifecycle(this.compatibleHook);
    }
  }
}
