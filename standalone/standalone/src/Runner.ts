import { ModuleConfig, ModuleConfigUtil, ModuleReference } from '@eggjs/tegg-common-util';
import { EggPrototype, LoadUnit, LoadUnitFactory } from '@eggjs/tegg-metadata';
import {
  ContextHandler,
  EggContainerFactory,
  LoadUnitInstance,
  LoadUnitInstanceFactory,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/tegg';
import { StandaloneUtil, MainRunner } from '@eggjs/tegg/standalone';
import { EggModuleLoader } from './EggModuleLoader';
import { StandaloneLoadUnit, StandaloneLoadUnitType } from './StandaloneLoadUnit';
import { StandaloneContext } from './StandaloneContext';
import { StandaloneContextHandler } from './StandaloneContextHandler';

export interface ModuleConfigHolder {
  name: string;
  config: ModuleConfig;
  reference: ModuleReference;
}

export interface RunnerOptions {
  innerObjects: Record<string, object>;
}

export class Runner {
  readonly cwd: string;
  readonly moduleReferences: readonly ModuleReference[];
  readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  private loadUnitLoader: EggModuleLoader;

  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];
  innerObjects: Record<string, object> | undefined;

  constructor(cwd: string, options?: RunnerOptions) {
    this.cwd = cwd;
    this.innerObjects = options?.innerObjects;
    this.moduleReferences = ModuleConfigUtil.readModuleReference(this.cwd);
    this.moduleConfigs = {};
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
    this.loadUnitLoader = new EggModuleLoader(this.moduleReferences);
  }

  async init() {
    this.loadUnits = [];
    if (this.innerObjects) {
      LoadUnitFactory.registerLoadUnitCreator(StandaloneLoadUnitType, () => {
        return new StandaloneLoadUnit(this.innerObjects!);
      });
      LoadUnitInstanceFactory.registerLoadUnitInstanceClass(StandaloneLoadUnitType, ModuleLoadUnitInstance.createModuleLoadUnitInstance);
      const standaloneLoadUnit = await LoadUnitFactory.createLoadUnit('MockStandaloneLoadUnitPath', StandaloneLoadUnitType, {
        load(): EggProtoImplClass[] {
          return [];
        },
      });
      this.loadUnits.push(standaloneLoadUnit);
    }
    const loadUnits = await this.loadUnitLoader.load();
    this.loadUnits = this.loadUnits.concat(loadUnits);

    const instances: LoadUnitInstance[] = [];
    for (const loadUnit of this.loadUnits) {
      const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      instances.push(instance);
    }
    this.loadUnitInstances = instances;
  }

  async run<T>() {
    const runnerClass = StandaloneUtil.getMainRunner();
    if (!runnerClass) {
      throw new Error('not found runner class. Do you add @Runner decorator?');
    }
    const proto = PrototypeUtil.getClazzProto(runnerClass);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${runnerClass.name}`);
    }
    const lifecycle = {};
    const ctx = new StandaloneContext();
    StandaloneContextHandler.register();
    return await ContextHandler.run(ctx, async () => {
      await ctx.init(lifecycle);
      const eggObject = await EggContainerFactory.getOrCreateEggObject(proto as EggPrototype);
      await ctx.destroy(lifecycle);
      const runner = eggObject.obj as MainRunner<T>;
      return await runner.main();
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
  }
}
