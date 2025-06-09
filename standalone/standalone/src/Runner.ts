import { Logger, ModuleReference } from '@eggjs/tegg-types';
import { EggContext } from '@eggjs/tegg-runtime';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { InnerObject, ModuleDependency } from './common/types';
import { EggModuleLoader } from './EggModuleLoader';
import { StandaloneApp } from './StandaloneApp';

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
  dump?: boolean;
}

// @deprecated, use StandaloneApp instead
export class Runner {
  #app: StandaloneApp;

  innerObjects: Record<string, InnerObject[]>;

  constructor(cwd: string, options?: RunnerOptions) {
    this.innerObjects = {};
    if (options?.innerObjects) {
      for (const [ name, obj ] of Object.entries(options.innerObjects)) {
        this.innerObjects[name] = [{
          obj,
        }];
      }
    } else if (options?.innerObjectHandlers) {
      Object.assign(this.innerObjects, options.innerObjectHandlers);
    }

    this.#app = new StandaloneApp({
      frameworkDeps: options?.dependencies,
      dump: options?.dump,
      innerObjects: this.innerObjects,
      logger: this.innerObjects.logger?.[0].obj as Logger,
    });

    const initOpts = {
      name: options?.name || '',
      env: options?.env || '',
      baseDir: cwd,
    };
    this.#app.initRuntime(initOpts);
    this.#app.loadFramework();
    this.#app.loadStandaloneModule(initOpts);
    this.#app.loadModuleConfigSync();
    this.#app.dump(initOpts);
  }

  async init() {
    await this.#app.instantiate();
    this.#app.initRunner();
  }

  async run<T>(aCtx?: EggContext) {
    return await this.#app.run<T>(aCtx);
  }

  async destroy() {
    await this.#app.destroy();
  }

  static getModuleReferences(cwd: string, dependencies?: RunnerOptions['dependencies']) {
    const moduleDirs = (dependencies || []).concat(cwd);
    return moduleDirs.reduce((list, baseDir) => {
      const module = typeof baseDir === 'string' ? { baseDir } : baseDir;
      return list.concat(...ModuleConfigUtil.readModuleReference(module.baseDir, module));
    }, [] as readonly ModuleReference[]);
  }

  static async preLoad(cwd: string, dependencies?: RunnerOptions['dependencies']) {
    const moduleReferences = Runner.getModuleReferences(cwd, dependencies);
    await EggModuleLoader.preLoad(moduleReferences, {
      baseDir: cwd,
      logger: console,
      dump: false,
    });
  }
}
