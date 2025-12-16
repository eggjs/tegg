import { Application } from 'egg';
import { CONTROLLER_LOAD_UNIT, ControllerLoadUnit } from './lib/ControllerLoadUnit';
import { AppLoadUnitControllerHook } from './lib/AppLoadUnitControllerHook';
import { GlobalGraph, LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';
import { ControllerMetaBuilderFactory, ControllerType } from '@eggjs/tegg';
import { HTTPControllerRegister } from './lib/impl/http/HTTPControllerRegister';
import { ControllerRegisterFactory } from './lib/ControllerRegisterFactory';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler';
import { LoadUnitInstanceLifecycleContext, ModuleLoadUnitInstance } from '@eggjs/tegg-runtime';
import { ControllerMetadataManager } from './lib/ControllerMetadataManager';
import { EggControllerPrototypeHook } from './lib/EggControllerPrototypeHook';
import { RootProtoManager } from './lib/RootProtoManager';
import { EggControllerLoader } from './lib/EggControllerLoader';
import { middlewareGraphHook } from './lib/MiddlewareGraphHook';
import assert from 'node:assert';

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

  private mcpControllerRegister?: typeof import('./lib/impl/mcp/MCPControllerRegister').MCPControllerRegister;

  constructor(app: Application) {
    this.app = app;
    this.controllerRegisterFactory = new ControllerRegisterFactory(this.app);
    this.app.rootProtoManager = new RootProtoManager();
    this.app.controllerRegisterFactory = this.controllerRegisterFactory;
    this.app.controllerMetaBuilderFactory = ControllerMetaBuilderFactory;
    this.loadUnitHook = new AppLoadUnitControllerHook(this.controllerRegisterFactory, this.app.rootProtoManager);
    this.controllerPrototypeHook = new EggControllerPrototypeHook();

    if (parseInt(process.versions.node.split('.')[0], 10) >= 18) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.mcpControllerRegister = require('./lib/impl/mcp/MCPControllerRegister').MCPControllerRegister;
    }
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

    if (this.app.config.security?.csrf !== void 0) {
      assert(typeof this.app.config.security.csrf === 'boolean' || typeof this.app.config.security.csrf === 'object', 'csrf must be boolean or object');

      if (typeof this.app.config.security.csrf === 'boolean') {
        this.app.config.security.csrf = {
          enable: this.app.config.security.csrf,
        };
      }
    }

    // init http root proto middleware
    this.prepareMiddleware(this.app.config.coreMiddleware);
    if (this.mcpEnable() && this.mcpControllerRegister) {
      this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, this.mcpControllerRegister.create);
      // Don't let the mcp's body be consumed
      this.app.config.coreMiddleware.unshift('mcpBodyMiddleware');

      if (this.app.config.security.csrf.ignore) {
        if (Array.isArray(this.app.config.security.csrf.ignore)) {
          this.app.config.security.csrf.ignore = [
            /^\/mcp\//,
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
          /^\/mcp\//,
          this.app.config.mcp.sseInitPath,
          this.app.config.mcp.sseMessagePath,
          this.app.config.mcp.streamPath,
          this.app.config.mcp.statelessStreamPath,
        ];
      }

      if (this.app.config.mcp.multipleServer) {
        for (const name of Object.keys(this.app.config.mcp.multipleServer)) {
          [ 'sseInitPath', 'sseMessagePath', 'streamPath', 'statelessStreamPath' ].forEach(key => {
            if (this.app.config.mcp.multipleServer[name][key]) this.app.config.security.csrf.ignore.push(this.app.config.mcp.multipleServer[name][key]);
          });
        }
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

    this.app.config.mcp.hooks = this.mcpControllerRegister?.hooks;
  }

  configDidLoad() {
    GlobalGraph.instance!.registerBuildHook(middlewareGraphHook);
  }

  async willReady() {
    if (this.mcpEnable() && this.mcpControllerRegister) {
      await this.mcpControllerRegister.connectStatelessStreamTransport();
      const names = this.mcpControllerRegister.instance?.mcpConfig.getMultipleServerNames();
      if (names && names.length > 0) {
        for (const name of names) {
          await this.mcpControllerRegister.connectStatelessStreamTransport(name);
        }
      }
    }
  }

  mcpEnable() {
    return majorVersion >= 18 && !!this.app.plugins.mcpProxy?.enable;
  }

  async beforeClose() {
    if (this.controllerLoadUnitHandler) {
      await this.controllerLoadUnitHandler.destroy();
    }
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.controllerPrototypeHook);
    ControllerMetadataManager.instance.clear();
    HTTPControllerRegister.clean();
    this.mcpControllerRegister?.clean();
  }
}
