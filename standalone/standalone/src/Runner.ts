import { ModuleConfigUtil, ModuleReference, RuntimeConfig } from '@eggjs/tegg-common-util';
import {
  EggPrototype,
  LoadUnit,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
} from '@eggjs/tegg-metadata';
import {
  ContextHandler,
  EggContainerFactory, EggContext,
  LoadUnitInstance,
  LoadUnitInstanceFactory,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/tegg';
import { StandaloneUtil, MainRunner } from '@eggjs/tegg/standalone';
import { EggModuleLoader } from './EggModuleLoader';
import { InnerObject, StandaloneLoadUnit, StandaloneLoadUnitType } from './StandaloneLoadUnit';
import { StandaloneContext } from './StandaloneContext';
import { StandaloneContextHandler } from './StandaloneContextHandler';
import { ModuleConfigHolder, ModuleConfigs } from './ModuleConfigs';
import { ConfigSourceQualifierAttribute } from './ConfigSource';
import { ConfigSourceLoadUnitHook } from './ConfigSourceLoadUnitHook';

export interface RunnerOptions {
  /**
   * @deprecated
   * use inner object handlers instead
   */
  innerObjects?: Record<string, object>;

  innerObjectHandlers?: Record<string, InnerObject[]>;
}

export class Runner {
  readonly cwd: string;
  readonly moduleReferences: readonly ModuleReference[];
  readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  private loadUnitLoader: EggModuleLoader;
  private runnerProto: EggPrototype;
  private configSourceEggPrototypeHook: ConfigSourceLoadUnitHook;

  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];
  innerObjects: Record<string, InnerObject[]>;

  constructor(cwd: string, options?: RunnerOptions) {
    this.cwd = cwd;
    this.moduleReferences = ModuleConfigUtil.readModuleReference(this.cwd);
    this.moduleConfigs = {};
    this.innerObjects = {
      moduleConfigs: [{
        obj: new ModuleConfigs(this.moduleConfigs),
      }],
      moduleConfig: [],
    };

    const runtimeConfig: Partial<RuntimeConfig> = {
      baseDir: this.cwd,
    };
    // Inject runtimeConfig
    this.innerObjects.runtimeConfig = [{
      obj: runtimeConfig,
    }];

    for (const reference of this.moduleReferences) {
      const absoluteRef = {
        path: ModuleConfigUtil.resolveModuleDir(reference.path, this.cwd),
      };

      const moduleName = ModuleConfigUtil.readModuleNameSync(absoluteRef.path);
      this.moduleConfigs[moduleName] = {
        name: moduleName,
        reference: absoluteRef,
        config: ModuleConfigUtil.loadModuleConfigSync(absoluteRef.path) || {},
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
  }

  async init() {
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
    this.loadUnits = [ standaloneLoadUnit, ...loadUnits ];

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
  }
}
