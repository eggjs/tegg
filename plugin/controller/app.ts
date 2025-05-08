import { Application } from 'egg';
import { CONTROLLER_LOAD_UNIT, ControllerLoadUnit } from './lib/ControllerLoadUnit';
import { AppLoadUnitControllerHook } from './lib/AppLoadUnitControllerHook';
import { LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';
import { ControllerMetaBuilderFactory, ControllerType } from '@eggjs/tegg';
import { HTTPControllerRegister } from './lib/impl/http/HTTPControllerRegister';
import { ControllerRegisterFactory } from './lib/ControllerRegisterFactory';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler';
import { LoadUnitInstanceLifecycleContext, ModuleLoadUnitInstance } from '@eggjs/tegg-runtime';
import { ControllerMetadataManager } from './lib/ControllerMetadataManager';
import { EggControllerPrototypeHook } from './lib/EggControllerPrototypeHook';
import { RootProtoManager } from './lib/RootProtoManager';
import { EggControllerLoader } from './lib/EggControllerLoader';
import { MCPControllerRegister } from './lib/impl/mcp/MCPControllerRegister';

// Load Controller process
// 1. await add load unit is ready, controller may depend other load unit
// 2. load ${app_base_dir}app/controller file
// 3. ControllerRegister register controller implement
const majorVersion = parseInt(process.versions.node.split('.')[0], 10);

export default class ControllerAppBootHook {
  private readonly app: Application;
  private readonly loadUnitHook: AppLoadUnitControllerHook;
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private controllerLoadUnitHandler: ControllerLoadUnitHandler;
  private readonly controllerPrototypeHook: EggControllerPrototypeHook;

  constructor(app: Application) {
    this.app = app;
    this.controllerRegisterFactory = new ControllerRegisterFactory(this.app);
    this.app.rootProtoManager = new RootProtoManager();
    this.app.controllerRegisterFactory = this.controllerRegisterFactory;
    this.app.controllerMetaBuilderFactory = ControllerMetaBuilderFactory;
    this.loadUnitHook = new AppLoadUnitControllerHook(this.controllerRegisterFactory, this.app.rootProtoManager);
    this.controllerPrototypeHook = new EggControllerPrototypeHook();
  }

  configWillLoad() {
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.controllerPrototypeHook);
    this.app.loaderFactory.registerLoader(CONTROLLER_LOAD_UNIT, unitPath => {
      return new EggControllerLoader(unitPath);
    });
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.HTTP, HTTPControllerRegister.create);
    this.app.loadUnitFactory.registerLoadUnitCreator(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitLifecycleContext): ControllerLoadUnit => {
        return new ControllerLoadUnit(
          `tegg-app-controller:${ctx.unitPath}`,
          ctx.unitPath,
          ctx.loader,
          this.app.eggPrototypeFactory,
          this.app.eggPrototypeCreatorFactory,
        );
      });
    this.app.loadUnitInstanceFactory.registerLoadUnitInstanceClass(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitInstanceLifecycleContext): ModuleLoadUnitInstance => {
        return new ModuleLoadUnitInstance(ctx.loadUnit);
      },
    );

    // init http root proto middleware
    this.prepareMiddleware(this.app.config.coreMiddleware);
    if (majorVersion >= 18) {
      this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, MCPControllerRegister.create);
      // Don't let the mcp's body be consumed
      this.app.config.coreMiddleware.unshift('mcpBodyMiddleware');

      if (this.app.config.security.csrf.ignore) {
        if (Array.isArray(this.app.config.security.csrf.ignore)) {
          this.app.config.security.csrf.ignore = [
            this.app.config.mcp.sseInitPath,
            this.app.config.mcp.sseMessagePath,
            this.app.config.mcp.streamPath,
            this.app.config.mcp.statelessStreamPath,
            ...(Array.isArray(this.app.config.security.csrf.ignore)
              ? this.app.config.security.csrf.ignore
              : [ this.app.config.security.csrf.ignore ]),
          ];
        }
      } else {
        this.app.config.security.csrf.ignore = [
          this.app.config.mcp.sseInitPath,
          this.app.config.mcp.sseMessagePath,
          this.app.config.mcp.streamPath,
          this.app.config.mcp.statelessStreamPath,
        ];
      }
    }
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

    // The real register HTTP controller/method.
    // HTTP method should sort by priority
    // The HTTPControllerRegister will collect all the methods
    // and register methods after collect is done.
    HTTPControllerRegister.instance?.doRegister(this.app.rootProtoManager);
  }

  async willReady() {
    if (majorVersion >= 18) {
      await MCPControllerRegister.connectStatelessStreamTransport();
    }
  }

  async beforeClose() {
    if (this.controllerLoadUnitHandler) {
      await this.controllerLoadUnitHandler.destroy();
    }
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.controllerPrototypeHook);
    ControllerMetadataManager.instance.clear();
    HTTPControllerRegister.clean();
  }
}
