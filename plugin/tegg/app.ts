import './lib/AppLoadUnit';
import './lib/AppLoadUnitInstance';
import './lib/EggCompatibleObject';
import { Application } from 'egg';
import { EggContextCompatibleHook } from './lib/EggContextCompatibleHook';
import { CompatibleUtil } from './lib/CompatibleUtil';
import { ModuleHandler } from './lib/ModuleHandler';
import { EggContextHandler } from './lib/EggContextHandler';
import { hijackRunInBackground } from './lib/run_in_background';
import { EggQualifierProtoHook } from './lib/EggQualifierProtoHook';

export default class App {
  private readonly app: Application;
  private compatibleHook?: EggContextCompatibleHook;
  private eggContextHandler: EggContextHandler;
  private eggQualifierProtoHook: EggQualifierProtoHook;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    this.app.config.coreMiddleware.push('teggCtxLifecycleMiddleware');
  }

  configDidLoad() {
    this.eggContextHandler = new EggContextHandler(this.app);
    this.app.eggContextHandler = this.eggContextHandler;
    this.eggContextHandler.register();
    this.app.moduleHandler = new ModuleHandler(this.app);
  }

  async didLoad() {
    hijackRunInBackground(this.app);
    // wait all file loaded, so app/ctx has all properties
    this.eggQualifierProtoHook = new EggQualifierProtoHook(this.app);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.eggQualifierProtoHook);
    // start load tegg objects
    await this.app.moduleHandler.init();
    this.compatibleHook = new EggContextCompatibleHook(this.app.moduleHandler);
    this.app.eggContextLifecycleUtil.registerLifecycle(this.compatibleHook);
  }

  async beforeClose() {
    CompatibleUtil.clean();
    await this.app.moduleHandler.destroy();
    if (this.compatibleHook) {
      this.app.eggContextLifecycleUtil.deleteLifecycle(this.compatibleHook);
    }
    if (this.eggQualifierProtoHook) {
      this.app.loadUnitLifecycleUtil.deleteLifecycle(this.eggQualifierProtoHook);
    }
  }
}
