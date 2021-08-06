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
    // Hack middleware order
    // Obj may create in core middleware,
    // so `teggCtxLifecycleMiddleware` should be last of core middlewares.
    // Middleware config should set in configWillLoad,
    // but tegg plugin is not the last plugin,
    // other plugin after tegg may modify middleware order,
    // so add teggCtxLifecycleMiddleware in configDidLoad
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
