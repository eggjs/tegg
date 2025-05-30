import path from 'node:path';
import {
  ConfigSourceQualifierAttribute,
  EggPrototype,
  LoadUnit,
  LoadUnitInstance,
  Logger,
  ModuleConfigHolder,
  ModuleReference,
  RuntimeConfig,
} from '@eggjs/tegg-types';
import { ModuleConfigs, ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { GlobalGraph, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { ContextHandler, EggContainerFactory, EggContext, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { MainRunner, StandaloneUtil } from '@eggjs/tegg/standalone';
import { TimeConsuming, Timing } from './common/utils/Timing';
import { StandaloneClassLoader } from './StandaloneClassLoader';
import { InnerObject } from './common/types';
import { StandaloneLoadUnitInitializer } from './loadUnit/StandaloneLoadUnitInitializer';
import { ModuleLoadUnitInitializer } from './loadUnit/ModuleLoadUnitInitializer';
import { StandaloneContext } from './StandaloneContext';

export interface StandaloneRunnerInit {
  frameworkPath?: string;
  timing?: Timing;
  dump?: boolean;
  innerObjects?: Record<string, InnerObject[]>;
  logger?: Logger;
}

export interface LoadStandaloneModuleOptions {
  name: string;
  env: string;
  baseDir: string;
}

export class StandaloneApp {
  readonly #frameworkPath: string;
  readonly #moduleReferences: ModuleReference[];
  readonly #classLoader: StandaloneClassLoader;
  readonly #innerObjects: Record<string, InnerObject[]>;
  readonly #moduleConfigs: Record<string, ModuleConfigHolder>;
  readonly #runtimeConfig: RuntimeConfig;
  readonly #standaloneLoadUnitInitializer: StandaloneLoadUnitInitializer;
  readonly #moduleLoadUnitInitializer: ModuleLoadUnitInitializer;
  readonly #loadUnits: LoadUnit[];
  readonly #loadUnitInstances: LoadUnitInstance[];
  readonly #logger?: Logger;
  readonly timing: Timing;
  #runnerProto: EggPrototype;

  constructor(init: StandaloneRunnerInit) {
    this.#frameworkPath = init.frameworkPath || path.join(__dirname, '..');
    this.#moduleReferences = [];
    this.#moduleConfigs = {};
    // in constructor, there is no runtime config yet, pre-create the object first
    this.#runtimeConfig = {} as any;
    this.#loadUnits = [];
    this.#loadUnitInstances = [];
    this.#logger = init.logger;
    this.timing = init.timing || new Timing();
    const classLoader = new StandaloneClassLoader({
      timing: this.timing,
      dump: init.dump,
    });
    this.#classLoader = classLoader;
    this.#standaloneLoadUnitInitializer = new StandaloneLoadUnitInitializer({ classLoader });
    const globalGraph = new GlobalGraph();
    GlobalGraph.instance = globalGraph;
    this.#moduleLoadUnitInitializer = new ModuleLoadUnitInitializer({ classLoader, globalGraph });

    this.#innerObjects = this.#createInnerObjects(init);
  }

  #createInnerObjects(init: StandaloneRunnerInit) {
    return Object.assign({}, init.innerObjects, {
      moduleConfigs: [{
        obj: new ModuleConfigs(this.#moduleConfigs),
      }],
      moduleConfig: [],
      runtimeConfig: [{
        obj: this.#runtimeConfig,
      }],
    });
  }

  initRuntime(opts: LoadStandaloneModuleOptions) {
    this.#runtimeConfig.name = opts.name;
    this.#runtimeConfig.env = opts.env;
    this.#runtimeConfig.baseDir = opts.baseDir;
    this.#logger?.debug('init runtime config: %j', this.#runtimeConfig);

    // load module.yml and module.env.yml by default
    if (!ModuleConfigUtil.configNames) {
      ModuleConfigUtil.configNames = [ 'module.default', `module.${this.#runtimeConfig.env}` ];
    }
    this.#logger?.debug('use module config names: %j', ModuleConfigUtil.configNames);
  }

  @TimeConsuming()
  async loadFramework() {
    this.#loadModule(this.#frameworkPath);
  }

  @TimeConsuming()
  async loadStandaloneModule(opts: LoadStandaloneModuleOptions) {
    this.#loadModule(opts.baseDir);
  }

  @TimeConsuming()
  async loadModuleConfig() {
    for (const reference of this.#moduleReferences) {
      const moduleConfig = {
        name: reference.name,
        reference,
        config: ModuleConfigUtil.loadModuleConfig(reference.path),
      };
      this.#logger?.debug('load module config %j', moduleConfig);

      this.#moduleConfigs[reference.name] = moduleConfig;

      this.#innerObjects.moduleConfig.push({
        obj: moduleConfig.config,
        qualifiers: [{
          attribute: ConfigSourceQualifierAttribute,
          value: moduleConfig.name,
        }],
      });
    }
  }

  @TimeConsuming()
  async instantiate() {
    const createLoadUnitProcess = this.timing.start('create load unit');
    const standaloneLoadUnit = await this.#standaloneLoadUnitInitializer.createLoadUnit({ innerObjects: this.#innerObjects });
    const moduleLoadUnits = await this.#moduleLoadUnitInitializer.createModuleLoadUnits();
    createLoadUnitProcess.end();

    const loadUnits = [ standaloneLoadUnit, ...moduleLoadUnits ];
    for (const loadUnit of loadUnits) {
      const createLoadUnitInstanceProcess = this.timing.start(`create load unit instance ${loadUnit.name}`);
      this.#loadUnits.push(loadUnit);
      const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      this.#loadUnitInstances.push(instance);
      createLoadUnitInstanceProcess.end();
    }
  }

  initRunner() {
    const runnerClass = StandaloneUtil.getMainRunner();
    if (!runnerClass) {
      throw new Error('not found runner class. Do you add @Runner decorator?');
    }
    const proto = PrototypeUtil.getClazzProto(runnerClass);
    if (!proto) {
      throw new Error(`can not get proto for runner clazz ${runnerClass.name}`);
    }
    this.#runnerProto = proto as EggPrototype;
  }

  #loadModule(baseDir: string) {
    const moduleScanProcess = this.timing.start('scan module reference');
    const moduleReferences = ModuleConfigUtil.readModuleReference(baseDir);
    moduleScanProcess.end();
    this.#logger?.debug('scan module references in %s, find %j', baseDir, moduleReferences);

    for (const module of moduleReferences) {
      this.#moduleReferences.push(module);
      const moduleDescriptor = this.#classLoader.loadModule(module);
      this.#standaloneLoadUnitInitializer.addInnerObjectProto(module);
      this.#moduleLoadUnitInitializer.addModule(moduleDescriptor);
    }
  }

  async init(opts: LoadStandaloneModuleOptions) {
    this.initRuntime(opts);
    await this.loadFramework();
    await this.loadStandaloneModule(opts);
    await this.loadModuleConfig();
    await this.instantiate();
    this.initRunner();
  }

  async run<T>(aCtx?: EggContext) {
    const lifecycle = {};
    const ctx = aCtx || new StandaloneContext();
    return await ContextHandler.run(ctx, async () => {
      await ctx.init?.(lifecycle);
      const eggObject = await EggContainerFactory.getOrCreateEggObject(this.#runnerProto);
      const runner = eggObject.obj as MainRunner<T>;
      try {
        return await runner.main();
      } finally {
        ctx.destroy?.(lifecycle).catch(e => {
          e.message = `[tegg/standalone] destroy tegg context failed: ${e.message}`;
          console.warn(e);
        });
      }
    });
  }

  async destroy() {
    while (this.#loadUnitInstances.length > 0) {
      const loadUnitInstance = this.#loadUnitInstances.pop();
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(loadUnitInstance!);
    }

    while (this.#loadUnits.length > 0) {
      const loadUnit = this.#loadUnits.pop();
      if (loadUnit) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
  }
}
