import './lib/AppLoadUnit';
import './lib/AppLoadUnitInstance';
import './lib/EggCompatibleObject';
import { Application, Context } from 'egg';
import { BackgroundTaskHelper, PrototypeUtil } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContextCompatibleHook } from './lib/EggContextCompatibleHook';
import { CompatibleUtil } from './lib/CompatibleUtil';
import { ModuleHandler } from './lib/ModuleHandler';
import { EggContextHandler } from './lib/EggContextHandler';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { TEggPluginContext } from './app/extend/context';

export default class App {
  private readonly app: Application;
  private compatibleHook?: EggContextCompatibleHook;
  private eggContextHandler: EggContextHandler;

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
    const eggRunInBackground = this.app.context.runInBackground;
    this.app.context.runInBackground = function runInBackground(this: TEggPluginContext, scope: (ctx: Context) => Promise<any>) {
      if (!this[TEGG_CONTEXT]) {
        return Reflect.apply(eggRunInBackground, this, [ scope ]);
      }
      let resolveBackgroundTask;
      const backgroundTaskPromise = new Promise(resolve => {
        resolveBackgroundTask = resolve;
      });
      const newScope = async () => {
        try {
          await scope(this);
        } finally {
          resolveBackgroundTask();
        }
      };
      Reflect.apply(eggRunInBackground, this, [ newScope ]);

      const proto = PrototypeUtil.getClazzProto(BackgroundTaskHelper);
      const eggObject = this.app.eggContainerFactory.getEggObject(proto as EggPrototype);
      const backgroundTaskHelper = eggObject.obj as BackgroundTaskHelper;
      backgroundTaskHelper.run(async () => {
        await backgroundTaskPromise;
      });
    };

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
