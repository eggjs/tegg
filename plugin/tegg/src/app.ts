import './lib/AppLoadUnit.js';
import './lib/AppLoadUnitInstance.js';
import './lib/EggCompatibleObject.js';
import { Application, ILifecycleBoot } from 'egg';
import { LoadUnitMultiInstanceProtoHook } from '@eggjs/tegg-metadata';
import { EggContextCompatibleHook } from './lib/EggContextCompatibleHook.js';
import { CompatibleUtil } from './lib/CompatibleUtil.js';
import { ModuleHandler } from './lib/ModuleHandler.js';
import { EggContextHandler } from './lib/EggContextHandler.js';
import { hijackRunInBackground } from './lib/run_in_background.js';
import { EggQualifierProtoHook } from './lib/EggQualifierProtoHook.js';
import { ConfigSourceLoadUnitHook } from './lib/ConfigSourceLoadUnitHook.js';

export default class App implements ILifecycleBoot {
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
    LoadUnitMultiInstanceProtoHook.clear();
  }
}
