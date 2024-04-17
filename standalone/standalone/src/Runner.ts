import { ModuleConfigUtil, ModuleReference, ReadModuleReferenceOptions, RuntimeConfig } from '@eggjs/tegg-common-util';
import {
  EggPrototype,
  EggPrototypeLifecycleUtil,
  LoadUnit,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
  LoadUnitMultiInstanceProtoHook,
} from '@eggjs/tegg-metadata';
import {
  ContextHandler,
  EggContainerFactory,
  EggContext,
  EggObjectLifecycleUtil,
  LoadUnitInstance,
  LoadUnitInstanceFactory,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import {
  EggProtoImplClass,
  PrototypeUtil,
  ModuleConfigHolder,
  ModuleConfigs,
  ConfigSourceQualifierAttribute,
  Logger,
} from '@eggjs/tegg';
import { StandaloneUtil, MainRunner } from '@eggjs/tegg/standalone';
import { CrosscutAdviceFactory } from '@eggjs/tegg/aop';
import { EggObjectAopHook, EggPrototypeCrossCutHook, LoadUnitAopHook } from '@eggjs/tegg-aop-runtime';

import { EggModuleLoader } from './EggModuleLoader';
import { InnerObject, StandaloneLoadUnit, StandaloneLoadUnitType } from './StandaloneLoadUnit';
import { StandaloneContext } from './StandaloneContext';
import { StandaloneContextHandler } from './StandaloneContextHandler';
import { ConfigSourceLoadUnitHook } from './ConfigSourceLoadUnitHook';
import { LoadUnitInnerClassHook } from './LoadUnitInnerClassHook';
import { DalTableEggPrototypeHook } from '@eggjs/tegg-dal-plugin/lib/DalTableEggPrototypeHook';
import { DalModuleLoadUnitHook } from '@eggjs/tegg-dal-plugin/lib/DalModuleLoadUnitHook';
import { MysqlDataSourceManager } from '@eggjs/tegg-dal-plugin/lib/MysqlDataSourceManager';
import { SqlMapManager } from '@eggjs/tegg-dal-plugin/lib/SqlMapManager';
import { TableModelManager } from '@eggjs/tegg-dal-plugin/lib/TableModelManager';

export interface ModuleDependency extends ReadModuleReferenceOptions {
  baseDir: string;
}

export interface RunnerOptions {
  /**
   * @deprecated
   * use inner object handlers instead
   */
  innerObjects?: Record<string, object>;
  env?: string;
  name?: string;
  innerObjectHandlers?: Record<string, InnerObject[]>;
  dependencies?: (string | ModuleDependency)[];
}

export class Runner {
  readonly cwd: string;
  readonly moduleReferences: readonly ModuleReference[];
  readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  readonly env?: string;
  readonly name?: string;
  private loadUnitLoader: EggModuleLoader;
  private runnerProto: EggPrototype;
  private configSourceEggPrototypeHook: ConfigSourceLoadUnitHook;
  private loadUnitMultiInstanceProtoHook: LoadUnitMultiInstanceProtoHook;
  private dalTableEggPrototypeHook: DalTableEggPrototypeHook;
  private dalModuleLoadUnitHook: DalModuleLoadUnitHook;

  private readonly loadUnitInnerClassHook: LoadUnitInnerClassHook;
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;
  private readonly loadUnitAopHook: LoadUnitAopHook;
  private readonly eggPrototypeCrossCutHook: EggPrototypeCrossCutHook;
  private readonly eggObjectAopHook: EggObjectAopHook;

  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];
  innerObjects: Record<string, InnerObject[]>;

  constructor(cwd: string, options?: RunnerOptions) {
    this.cwd = cwd;
    this.env = options?.env;
    this.name = options?.name;
    const moduleDirs = (options?.dependencies || []).concat(this.cwd);
    this.moduleReferences = moduleDirs.reduce((list, baseDir) => {
      const module = typeof baseDir === 'string' ? { baseDir } : baseDir;
      return list.concat(...ModuleConfigUtil.readModuleReference(module.baseDir, module));
    }, [] as readonly ModuleReference[]);
    this.moduleConfigs = {};
    this.innerObjects = {
      moduleConfigs: [{
        obj: new ModuleConfigs(this.moduleConfigs),
      }],
      moduleConfig: [],
    };

    const runtimeConfig: Partial<RuntimeConfig> = {
      baseDir: this.cwd,
      name: this.name,
      env: this.env,
    };
    // Inject runtimeConfig
    this.innerObjects.runtimeConfig = [{
      obj: runtimeConfig,
    }];

    // load module.yml and module.env.yml by default
    if (!ModuleConfigUtil.configNames) {
      ModuleConfigUtil.configNames = [ 'module.default', `module.${this.env}` ];
    }
    for (const reference of this.moduleReferences) {
      const absoluteRef = {
        path: ModuleConfigUtil.resolveModuleDir(reference.path, this.cwd),
        name: reference.name,
      };

      const moduleName = ModuleConfigUtil.readModuleNameSync(absoluteRef.path);
      this.moduleConfigs[moduleName] = {
        name: moduleName,
        reference: absoluteRef,
        config: ModuleConfigUtil.loadSync(absoluteRef.path),
      };
    }
    for (const moduleConfig of Object.values(this.moduleConfigs)) {
      this.innerObjects.moduleConfig.push({
        obj: moduleConfig.config,
        qualifiers: [{
          attribute: ConfigSourceQualifierAttribute,
          value: moduleConfig.name,
        }],
      });
    }
    if (options?.innerObjects) {
      for (const [ name, obj ] of Object.entries(options.innerObjects)) {
        this.innerObjects[name] = [{
          obj,
        }];
      }
    } else if (options?.innerObjectHandlers) {
      Object.assign(this.innerObjects, options.innerObjectHandlers);
    }
    this.loadUnitLoader = new EggModuleLoader(this.moduleReferences);
    const configSourceEggPrototypeHook = new ConfigSourceLoadUnitHook();
    LoadUnitLifecycleUtil.registerLifecycle(configSourceEggPrototypeHook);

    this.loadUnitInnerClassHook = new LoadUnitInnerClassHook();
    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitInnerClassHook);

    // TODO refactor with egg module
    // aop runtime
    this.crosscutAdviceFactory = new CrosscutAdviceFactory();
    this.loadUnitAopHook = new LoadUnitAopHook(this.crosscutAdviceFactory);
    this.eggPrototypeCrossCutHook = new EggPrototypeCrossCutHook(this.crosscutAdviceFactory);
    this.eggObjectAopHook = new EggObjectAopHook();

    EggPrototypeLifecycleUtil.registerLifecycle(this.eggPrototypeCrossCutHook);
    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitAopHook);
    EggObjectLifecycleUtil.registerLifecycle(this.eggObjectAopHook);

    this.loadUnitMultiInstanceProtoHook = new LoadUnitMultiInstanceProtoHook();
    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitMultiInstanceProtoHook);

    this.dalModuleLoadUnitHook = new DalModuleLoadUnitHook(this.env ?? '', this.moduleConfigs);
    const loggerInnerObject = this.innerObjects.logger && this.innerObjects.logger[0];
    const logger = loggerInnerObject?.obj || console;
    this.dalTableEggPrototypeHook = new DalTableEggPrototypeHook(logger as Logger);
    EggPrototypeLifecycleUtil.registerLifecycle(this.dalTableEggPrototypeHook);
    LoadUnitLifecycleUtil.registerLifecycle(this.dalModuleLoadUnitHook);
  }

  async load() {
    StandaloneContextHandler.register();
    LoadUnitFactory.registerLoadUnitCreator(StandaloneLoadUnitType, () => {
      return new StandaloneLoadUnit(this.innerObjects);
    });
    LoadUnitInstanceFactory.registerLoadUnitInstanceClass(StandaloneLoadUnitType, ModuleLoadUnitInstance.createModuleLoadUnitInstance);
    const standaloneLoadUnit = await LoadUnitFactory.createLoadUnit('MockStandaloneLoadUnitPath', StandaloneLoadUnitType, {
      load(): EggProtoImplClass[] {
        return [];
      },
    });
    const loadUnits = await this.loadUnitLoader.load();
    return [ standaloneLoadUnit, ...loadUnits ];
  }

  async init() {
    this.loadUnits = await this.load();
    const instances: LoadUnitInstance[] = [];
    for (const loadUnit of this.loadUnits) {
      const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      instances.push(instance);
    }
    this.loadUnitInstances = instances;
    const runnerClass = StandaloneUtil.getMainRunner();
    if (!runnerClass) {
      throw new Error('not found runner class. Do you add @Runner decorator?');
    }
    const proto = PrototypeUtil.getClazzProto(runnerClass);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${runnerClass.name}`);
    }
    this.runnerProto = proto as EggPrototype;
  }

  async run<T>(aCtx?: EggContext) {
    const lifecycle = {};
    const ctx = aCtx || new StandaloneContext();
    return await ContextHandler.run(ctx, async () => {
      if (ctx.init) {
        await ctx.init(lifecycle);
      }
      const eggObject = await EggContainerFactory.getOrCreateEggObject(this.runnerProto);
      const runner = eggObject.obj as MainRunner<T>;
      try {
        return await runner.main();
      } finally {
        if (ctx.destroy) {
          ctx.destroy(lifecycle).catch(e => {
            e.message = `[tegg/standalone] destroy tegg context failed: ${e.message}`;
            console.warn(e);
          });
        }
      }
    });
  }

  async destroy() {
    if (this.loadUnitInstances) {
      for (const instance of this.loadUnitInstances) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of this.loadUnits) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
    if (this.configSourceEggPrototypeHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.configSourceEggPrototypeHook);
    }

    if (this.loadUnitInnerClassHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitInnerClassHook);
    }

    if (this.eggPrototypeCrossCutHook) {
      EggPrototypeLifecycleUtil.deleteLifecycle(this.eggPrototypeCrossCutHook);
    }
    if (this.loadUnitAopHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitAopHook);
    }
    if (this.eggObjectAopHook) {
      EggObjectLifecycleUtil.deleteLifecycle(this.eggObjectAopHook);
    }

    if (this.loadUnitMultiInstanceProtoHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitMultiInstanceProtoHook);
    }

    if (this.dalTableEggPrototypeHook) {
      EggPrototypeLifecycleUtil.deleteLifecycle(this.dalTableEggPrototypeHook);
    }
    if (this.dalModuleLoadUnitHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.dalModuleLoadUnitHook);
    }
    MysqlDataSourceManager.instance.clear();
    SqlMapManager.instance.clear();
    TableModelManager.instance.clear();
  }
}
