import {
  ModuleDescriptor,
  ModuleDescriptorDumper,
  PrototypeClassDefinition,
} from '@eggjs/tegg-metadata';
import { TimeConsuming, Timing } from './common/utils/Timing';
import { Logger, ModuleReference } from '@eggjs/tegg-types';
import { LoaderFactory } from '@eggjs/tegg-loader';

export interface StandaloneModuleLoaderInit {
  timing?: Timing;
  dump?: boolean;
}

export interface DumpStandaloneModule {
  baseDir: string;
  logger?: Logger;
}

export class StandaloneClassLoader {
  timing: Timing;
  readonly #dump: boolean;
  readonly #moduleDescriptorMap: Record<string, ModuleDescriptor>;

  constructor(init?: StandaloneModuleLoaderInit) {
    this.timing = init?.timing || new Timing();
    this.#dump = init?.dump !== false;
    this.#moduleDescriptorMap = {};
  }

  @TimeConsuming(m => `load module ${m.name}`)
  loadModule(moduleReference: ModuleReference) {
    const descriptor = LoaderFactory.loadModule(moduleReference);
    const id = StandaloneClassLoader.#moduleDescriptorId(moduleReference);
    this.#moduleDescriptorMap[id] = descriptor;

    return descriptor;
  }

  getInnerObjectClass(moduleReference: ModuleReference) {
    const id = StandaloneClassLoader.#moduleDescriptorId(moduleReference);
    const module = this.#moduleDescriptorMap[id];
    return module?.innerObjectClazzList;
  }

  getMultiInstanceClassDefinitions(): PrototypeClassDefinition[] {
    const definitions: PrototypeClassDefinition[] = [];
    for (const moduleDescriptor of Object.values(this.#moduleDescriptorMap)) {
      for (const clazz of moduleDescriptor.multiInstanceClazzList) {
        const definition: PrototypeClassDefinition = {
          clazz,
          defineModuleName: moduleDescriptor.name,
          defineUnitPath: moduleDescriptor.unitPath,
        };
        definitions.push(definition);
      }
    }

    return definitions;
  }

  async dump(opts: DumpStandaloneModule) {
    if (this.#dump) {
      const dumpDir = opts.baseDir;
      for (const moduleDescriptor of Object.values(this.#moduleDescriptorMap)) {
        try {
          await ModuleDescriptorDumper.dump(moduleDescriptor, { dumpDir });
        } catch (e: any) {
          e.message = 'dump module descriptor failed: ' + e.message;
          opts.logger?.warn(e);
        }
      }
    }
  }

  static #moduleDescriptorId(moduleReference: ModuleReference): string {
    return `${moduleReference.name}@${moduleReference.path}`;
  }
}
