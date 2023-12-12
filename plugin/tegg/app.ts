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
import { LoadUnitMultiInstanceProtoHook } from '@eggjs/tegg-metadata';
import { ConfigSourceLoadUnitHook } from './lib/ConfigSourceLoadUnitHook';

export default class App {
  private readonly app: Application;
  private compatibleHook?: EggContextCompatibleHook;
  private eggContextHandler: EggContextHandler;
  private eggQualifierProtoHook: EggQualifierProtoHook;
  private loadUnitMultiInstanceProtoHook: LoadUnitMultiInstanceProtoHook;
  private configSourceEggPrototypeHook: ConfigSourceLoadUnitHook;

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
    this.loadUnitMultiInstanceProtoHook = new LoadUnitMultiInstanceProtoHook();
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.loadUnitMultiInstanceProtoHook);

    // wait all file loaded, so app/ctx has all properties
    this.eggQualifierProtoHook = new EggQualifierProtoHook(this.app);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.eggQualifierProtoHook);

    this.configSourceEggPrototypeHook = new ConfigSourceLoadUnitHook();
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.configSourceEggPrototypeHook);

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
    if (this.configSourceEggPrototypeHook) {
      this.app.loadUnitLifecycleUtil.deleteLifecycle(this.configSourceEggPrototypeHook);
    }
    if (this.loadUnitMultiInstanceProtoHook) {
      this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitMultiInstanceProtoHook);
    }
  }
}
