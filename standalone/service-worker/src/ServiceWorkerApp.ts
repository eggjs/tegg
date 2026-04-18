import path from 'node:path';
import {
  EggPrototypeLifecycleUtil,
  LoadUnitLifecycleUtil,
} from '@eggjs/tegg-metadata';
import { Runner, RunnerOptions, StandaloneContext } from '@eggjs/tegg-standalone';
import type { Logger } from '@eggjs/tegg-types';
import { getDefaultHttpClient } from 'urllib';
import { ContextProtoProperty } from './constants';
import { FetchRouter } from './http/FetchRouter';
import { RootProtoManager } from './controller/RootProtoManager';
import { ControllerMetadataManager } from './controller/ControllerMetadataManager';
import { ControllerRegisterFactory } from './controller/ControllerRegisterFactory';
import { ContextProtoLoadUnitHook } from './hook/ContextProtoLoadUnitHook';
import { ControllerPrototypeHook } from './hook/ControllerPrototypeHook';
import { ControllerLoadUnitHook } from './hook/ControllerLoadUnitHook';
import { HTTPControllerRegister } from './http/HTTPControllerRegister';
import { MCPControllerRegister } from './mcp/MCPControllerRegister';
import { LoadUnitInnerClassHook } from './hook/LoadUnitInnerClassHook';
import { ServiceWorkerRunner } from './ServiceWorkerRunner';
import { StandaloneEggObjectFactory } from './StandaloneEggObjectFactory';
import { FetchEventHandler } from './http/FetchEventHandler';

export interface ServiceWorkerAppOptions {
  innerObjectHandlers?: RunnerOptions['innerObjectHandlers'];
  logger?: Logger;
}

export class ServiceWorkerApp {
  private readonly runner: Runner;
  private readonly contextProtoLoadUnitHook: ContextProtoLoadUnitHook;
  private readonly controllerPrototypeHook: ControllerPrototypeHook;
  private readonly controllerLoadUnitHook: ControllerLoadUnitHook;
  private readonly fetchRouter: FetchRouter;
  private readonly rootProtoManager: RootProtoManager;
  private readonly controllerMetadataManager: ControllerMetadataManager;
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private readonly loadUnitInnerClassHook: LoadUnitInnerClassHook;

  constructor(cwd: string, options?: ServiceWorkerAppOptions & RunnerOptions) {
    // Create shared objects
    this.fetchRouter = new FetchRouter();
    this.rootProtoManager = new RootProtoManager();
    this.controllerMetadataManager = new ControllerMetadataManager();
    this.controllerRegisterFactory = new ControllerRegisterFactory();

    // Create lifecycle hooks
    this.contextProtoLoadUnitHook = new ContextProtoLoadUnitHook('serviceWorker');
    this.controllerPrototypeHook = new ControllerPrototypeHook();
    this.controllerLoadUnitHook = new ControllerLoadUnitHook(
      this.controllerRegisterFactory,
      this.rootProtoManager,
      this.controllerMetadataManager,
      this.fetchRouter,
    );

    // Register lifecycle hooks
    LoadUnitLifecycleUtil.registerLifecycle(this.contextProtoLoadUnitHook);
    LoadUnitLifecycleUtil.registerLifecycle(this.controllerLoadUnitHook);
    EggPrototypeLifecycleUtil.registerLifecycle(this.controllerPrototypeHook);

    // Build dependencies list - include this package as a framework dependency
    const frameworkDep = { baseDir: path.join(__dirname, '..'), extraFilePattern: [ '!**/test' ] };
    const deps = [ ...(options?.dependencies || []), frameworkDep ];

    // Register FetchRouter and RootProtoManager as inner objects so they can be @Inject()-ed
    const innerObjectHandlers: RunnerOptions['innerObjectHandlers'] = {
      ...options?.innerObjectHandlers,
      fetchRouter: [{ obj: this.fetchRouter }],
      rootProtoManager: [{ obj: this.rootProtoManager }],
    };

    // Provide default logger (fallback to console) and httpclient (urllib singleton)
    if (!innerObjectHandlers.logger) {
      innerObjectHandlers.logger = [{ obj: options?.logger || console }];
    }
    if (!innerObjectHandlers.httpclient) {
      innerObjectHandlers.httpclient = [{ obj: getDefaultHttpClient() }];
    }

    this.loadUnitInnerClassHook = new LoadUnitInnerClassHook([ StandaloneEggObjectFactory, ServiceWorkerRunner, FetchEventHandler ]);

    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitInnerClassHook);

    this.runner = new Runner(cwd, {
      ...options,
      dependencies: deps,
      innerObjectHandlers,
    });
  }

  async init() {
    await this.runner.init();
  }

  async handleEvent<T = unknown>(event: Event) {
    const context = new StandaloneContext();
    context.set(ContextProtoProperty.Event.contextKey, event);

    return await this.runner.run<T>(context);
  }

  async destroy() {
    // Clean up static singletons
    HTTPControllerRegister.clean();
    MCPControllerRegister.clean();

    // Unregister lifecycle hooks
    LoadUnitLifecycleUtil.deleteLifecycle(this.contextProtoLoadUnitHook);
    LoadUnitLifecycleUtil.deleteLifecycle(this.controllerLoadUnitHook);
    LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitInnerClassHook);
    EggPrototypeLifecycleUtil.deleteLifecycle(this.controllerPrototypeHook);

    await this.runner.destroy();
  }
}
