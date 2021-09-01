import { Application } from 'egg';
import { CONTROLLER_LOAD_UNIT, ControllerLoadUnit } from './lib/ControllerLoadUnit';
import { ControllerLoadUnitInstance } from './lib/ControllerLoadUnitInstance';
import { AppLoadUnitControllerHook } from './lib/AppLoadUnitControllerHook';
import { LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';
import { ControllerType } from '@eggjs/tegg';
import { HTTPControllerRegister } from './lib/impl/http/HTTPControllerRegister';
import { ControllerRegisterFactory } from './lib/ControllerRegisterFactory';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler';
import { EggControllerHook } from './lib/EggControllerHook';
import { LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-runtime';
import { ControllerMetadataManager } from './lib/ControllerMetadataManager';
import { EggControllerPrototypeHook } from './lib/EggControllerPrototypeHook';
import { RootProtoManager } from './lib/RootProtoManager';

// Load Controller process
// 1. await add load unit is ready, controller may depend other load unit
// 2. load ${app_base_dir}app/controller file
// 3. ControllerRegister register controller implement

export default class ControllerAppBootHook {
  private readonly app: Application;
  private readonly loadUnitHook: AppLoadUnitControllerHook;
  private controllerHook: EggControllerHook;
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private controllerLoadUnitHandler: ControllerLoadUnitHandler;
  private readonly controllerPrototypeHook: EggControllerPrototypeHook;

  constructor(app: Application) {
    this.app = app;
    this.controllerRegisterFactory = new ControllerRegisterFactory(this.app);
    this.app.rootProtoManager = new RootProtoManager();
    this.loadUnitHook = new AppLoadUnitControllerHook(this.controllerRegisterFactory, this.app.rootProtoManager);
    this.controllerPrototypeHook = new EggControllerPrototypeHook();
  }

  configWillLoad() {
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.controllerPrototypeHook);
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.HTTP, HTTPControllerRegister.create);
    this.app.loadUnitFactory.registerLoadUnitCreator(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitLifecycleContext): ControllerLoadUnit => {
        return new ControllerLoadUnit(
          'tegg-app-controller',
          ctx.unitPath,
          ctx.loader,
          this.app.eggPrototypeFactory,
          this.app.eggPrototypeCreatorFactory,
        );
      });
    this.app.loadUnitInstanceFactory.registerLoadUnitInstanceClass(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitInstanceLifecycleContext): ControllerLoadUnitInstance => {
        return new ControllerLoadUnitInstance(ctx.loadUnit, this.app.loadUnitInstanceLifecycleUtil);
      },
    );

    // init http root proto middleware
    this.prepareMiddleware(this.app.config.coreMiddleware);
  }

  prepareMiddleware(middlewareNames: string[]) {
    if (!middlewareNames.includes('teggCtxLifecycleMiddleware')) {
      middlewareNames.unshift('teggCtxLifecycleMiddleware');
    }

    const index = middlewareNames.indexOf('teggCtxLifecycleMiddleware');
    middlewareNames.splice(index, 0, 'teggRootProto');
    return middlewareNames;
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
    this.controllerLoadUnitHandler = new ControllerLoadUnitHandler(this.app);
    await this.controllerLoadUnitHandler.ready();
    this.controllerHook = new EggControllerHook(this.controllerLoadUnitHandler);
    this.app.eggContextLifecycleUtil.registerLifecycle(this.controllerHook);

    // The real register HTTP controller/method.
    // HTTP method should sort by priority
    // The HTTPControllerRegister will collect all the methods
    // and register methods after collect is done.
    HTTPControllerRegister.instance?.doRegister(this.app.rootProtoManager);
  }

  async beforeClose() {
    if (this.controllerLoadUnitHandler) {
      await this.controllerLoadUnitHandler.destroy();
    }
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.controllerPrototypeHook);
    ControllerMetadataManager.instance.clear();
    if (this.controllerHook) {
      this.app.eggContextLifecycleUtil.deleteLifecycle(this.controllerHook);
    }
    HTTPControllerRegister.clean();
  }
}
