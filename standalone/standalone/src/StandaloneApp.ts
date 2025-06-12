import {
  ConfigSourceQualifierAttribute,
  EggPrototype,
  LoadUnit,
  LoadUnitInstance,
  Logger,
  ModuleConfigHolder,
  ModuleReference,
  type ReadModuleReferenceOptions,
  RuntimeConfig,
} from '@eggjs/tegg-types';
import { ModuleConfigs, ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { EggPrototypeLifecycleUtil, GlobalGraph, LoadUnitFactory, LoadUnitLifecycleUtil } from '@eggjs/tegg-metadata';
import {
  ContextHandler,
  EggContainerFactory,
  EggContext,
  EggObjectLifecycleUtil,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';
import { MainRunner, StandaloneUtil } from '@eggjs/tegg/standalone';
import { TimeConsuming, Timing } from './common/utils/Timing';
import { StandaloneClassLoader } from './StandaloneClassLoader';
import { InnerObject, ModuleDependency } from './common/types';
import { StandaloneLoadUnitInitializer } from './initializer/StandaloneLoadUnitInitializer';
import { ModuleLoadUnitInitializer } from './initializer/ModuleLoadUnitInitializer';
import { StandaloneContext } from './StandaloneContext';
import { StandaloneContextHandler } from './StandaloneContextHandler';
import './loadUnit/StandaloneLoadUnitInstance';
import {
  crossCutGraphHook,
  EggObjectAopHook,
  EggPrototypeCrossCutHook,
  LoadUnitAopHook,
  pointCutGraphHook,
} from '@eggjs/tegg-aop-runtime';
import { ConfigSourceLoadUnitHook } from './ConfigSourceLoadUnitHook';
import { CrosscutAdviceFactory } from '@eggjs/tegg/aop';
import { DalModuleLoadUnitHook } from '@eggjs/tegg-dal-plugin/lib/DalModuleLoadUnitHook';
import { DalTableEggPrototypeHook } from '@eggjs/tegg-dal-plugin/lib/DalTableEggPrototypeHook';
import { TransactionPrototypeHook } from '@eggjs/tegg-dal-plugin/lib/TransactionPrototypeHook';
import { MysqlDataSourceManager } from '@eggjs/tegg-dal-plugin/lib/MysqlDataSourceManager';
import { SqlMapManager } from '@eggjs/tegg-dal-plugin/lib/SqlMapManager';
import { TableModelManager } from '@eggjs/tegg-dal-plugin/lib/TableModelManager';

export interface StandaloneAppInit {
  frameworkDeps?: Array<string | ModuleDependency>;
  timing?: Timing;
  dump?: boolean;
  innerObjects?: Record<string, InnerObject[]>;
  logger?: Logger;
}

export interface InitStandaloneAppOptions {
  name: string;
  env: string;
  baseDir: string;
}

export class StandaloneApp {
  readonly #frameworkDeps: ModuleDependency[];
  readonly #moduleReferences: ModuleReference[];
  readonly #classLoader: StandaloneClassLoader;
  readonly #innerObjects: Record<string, InnerObject[]>;
  readonly #moduleConfigs: Record<string, ModuleConfigHolder>;
  readonly #runtimeConfig: RuntimeConfig;
  readonly #standaloneLoadUnitInitializer: StandaloneLoadUnitInitializer;
  readonly #moduleLoadUnitInitializer: ModuleLoadUnitInitializer;
  readonly #loadUnits: LoadUnit[];
  readonly #loadUnitInstances: LoadUnitInstance[];
  readonly #dump: boolean;
  readonly #logger?: Logger;
  readonly timing: Timing;
  #handleDestroy?: () => void;
  #runnerProto: EggPrototype;

  constructor(init?: StandaloneAppInit) {
    this.#frameworkDeps = (init?.frameworkDeps || []).map(baseDir => (typeof baseDir === 'string' ? { baseDir } : baseDir));
    this.#moduleReferences = [];
    this.#moduleConfigs = {};
    // in constructor, there is no runtime config yet, pre-create the object first
    this.#runtimeConfig = {} as any;
    this.#loadUnits = [];
    this.#loadUnitInstances = [];
    this.#dump = init?.dump !== false;
    this.#logger = init?.logger;
    this.timing = init?.timing || new Timing();
    const classLoader = new StandaloneClassLoader();
    this.#classLoader = classLoader;
    this.#standaloneLoadUnitInitializer = new StandaloneLoadUnitInitializer({ classLoader });
    const globalGraph = new GlobalGraph();
    GlobalGraph.instance = globalGraph;
    this.#moduleLoadUnitInitializer = new ModuleLoadUnitInitializer({ classLoader, globalGraph });

    this.#innerObjects = this.#createInnerObjects(init);
  }

  #createInnerObjects(init?: StandaloneAppInit) {
    return Object.assign({}, init?.innerObjects, {
      moduleConfigs: [{
        obj: new ModuleConfigs(this.#moduleConfigs),
      }],
      moduleConfig: [],
      runtimeConfig: [{
        obj: this.#runtimeConfig,
      }],
    });
  }

  // TODO, should be revamped to LifecycleProto
  #handleCompatibility(opts: InitStandaloneAppOptions) {
    const configSourceEggPrototypeHook = new ConfigSourceLoadUnitHook();
    LoadUnitLifecycleUtil.registerLifecycle(configSourceEggPrototypeHook);

    const crosscutAdviceFactory = new CrosscutAdviceFactory();
    const loadUnitAopHook = new LoadUnitAopHook(crosscutAdviceFactory);
    const eggPrototypeCrossCutHook = new EggPrototypeCrossCutHook(crosscutAdviceFactory);
    const eggObjectAopHook = new EggObjectAopHook();

    EggPrototypeLifecycleUtil.registerLifecycle(eggPrototypeCrossCutHook);
    LoadUnitLifecycleUtil.registerLifecycle(loadUnitAopHook);
    EggObjectLifecycleUtil.registerLifecycle(eggObjectAopHook);

    const dalModuleLoadUnitHook = new DalModuleLoadUnitHook(opts.env ?? '', this.#moduleConfigs, this.#logger);
    const dalTableEggPrototypeHook = new DalTableEggPrototypeHook(this.#logger || console);
    const transactionPrototypeHook = new TransactionPrototypeHook(this.#moduleConfigs, this.#logger);
    EggPrototypeLifecycleUtil.registerLifecycle(dalTableEggPrototypeHook);
    EggPrototypeLifecycleUtil.registerLifecycle(transactionPrototypeHook);
    LoadUnitLifecycleUtil.registerLifecycle(dalModuleLoadUnitHook);

    return () => {
      LoadUnitLifecycleUtil.deleteLifecycle(configSourceEggPrototypeHook);

      EggPrototypeLifecycleUtil.deleteLifecycle(eggPrototypeCrossCutHook);
      LoadUnitLifecycleUtil.deleteLifecycle(loadUnitAopHook);
      EggObjectLifecycleUtil.deleteLifecycle(eggObjectAopHook);

      EggPrototypeLifecycleUtil.deleteLifecycle(dalTableEggPrototypeHook);
      EggPrototypeLifecycleUtil.deleteLifecycle(transactionPrototypeHook);
      LoadUnitLifecycleUtil.deleteLifecycle(dalModuleLoadUnitHook);
    };
  }

  initRuntime(opts: InitStandaloneAppOptions) {
    this.#runtimeConfig.name = opts.name;
    this.#runtimeConfig.env = opts.env;
    this.#runtimeConfig.baseDir = opts.baseDir;
    this.#logger?.debug('init runtime config: %j', this.#runtimeConfig);

    // load module.yml and module.env.yml by default
    if (!ModuleConfigUtil.configNames) {
      ModuleConfigUtil.configNames = [ 'module.default', `module.${this.#runtimeConfig.env}` ];
    }
    this.#logger?.debug('use module config names: %j', ModuleConfigUtil.configNames);

    GlobalGraph.instance!.registerBuildHook(crossCutGraphHook);
    GlobalGraph.instance!.registerBuildHook(pointCutGraphHook);

    this.#handleDestroy = this.#handleCompatibility(opts);

    StandaloneContextHandler.register();
  }

  @TimeConsuming()
  loadFramework() {
    for (const dep of this.#frameworkDeps) {
      this.#loadModule(dep.baseDir, dep);
    }
  }

  @TimeConsuming()
  loadStandaloneModule(opts: InitStandaloneAppOptions) {
    this.#loadModule(opts.baseDir);
  }

  @TimeConsuming()
  async loadModuleConfig() {
    for (const reference of this.#moduleReferences) {
      const moduleConfig = {
        name: reference.name,
        reference,
        config: await ModuleConfigUtil.loadModuleConfig(reference.path),
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
  loadModuleConfigSync() {
    for (const reference of this.#moduleReferences) {
      const moduleConfig = {
        name: reference.name,
        reference,
        config: ModuleConfigUtil.loadModuleConfigSync(reference.path),
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
  async dump(opts: InitStandaloneAppOptions) {
    if (this.#dump) {
      await this.#classLoader.dump({
        baseDir: opts.baseDir,
        logger: this.#logger,
      });
    }
  }

  @TimeConsuming()
  async instantiate() {
    const createLoadUnitProcess = this.timing.start('create load unit');
    const standaloneLoadUnit = await this.#standaloneLoadUnitInitializer.createLoadUnit({ innerObjects: this.#innerObjects });
    this.#loadUnits.push(standaloneLoadUnit);
    const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(standaloneLoadUnit);
    this.#loadUnitInstances.push(instance);

    const loadUnits = await this.#moduleLoadUnitInitializer.createModuleLoadUnits();
    createLoadUnitProcess.end();

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

  #loadModule(baseDir: string, options?: ReadModuleReferenceOptions) {
    const moduleScanProcess = this.timing.start('scan module reference');
    const moduleReferences = ModuleConfigUtil.readModuleReference(baseDir, options);
    moduleScanProcess.end();
    this.#logger?.debug('scan module references in %s, find %j', baseDir, moduleReferences);

    for (const module of moduleReferences) {
      this.#moduleReferences.push(module);
      const loadModuleProcess = this.timing.start(`load module ${module.name}`);
      this.#classLoader.loadModule(module);
      loadModuleProcess.end();
      this.#standaloneLoadUnitInitializer.addInnerObjectProto(module);
      this.#moduleLoadUnitInitializer.addModule(module);
    }
  }

  async init(opts: InitStandaloneAppOptions) {
    this.initRuntime(opts);
    this.loadFramework();
    this.loadStandaloneModule(opts);
    await this.loadModuleConfig();
    this.dump(opts);
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

    this.#handleDestroy?.();

    MysqlDataSourceManager.instance.clear();
    SqlMapManager.instance.clear();
    TableModelManager.instance.clear();
    // clear configNames
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
