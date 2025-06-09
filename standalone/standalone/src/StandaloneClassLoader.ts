import { ModuleDescriptor, ModuleDescriptorDumper, PrototypeClassDefinition } from '@eggjs/tegg-metadata';
import { Logger, ModuleReference } from '@eggjs/tegg-types';
import { LoaderFactory } from '@eggjs/tegg-loader';

export interface DumpStandaloneModule {
  baseDir: string;
  logger?: Logger;
}

export class StandaloneClassLoader {
  readonly #moduleDescriptorMap: Record<string, ModuleDescriptor>;

  constructor() {
    this.#moduleDescriptorMap = {};
  }

  loadModule(moduleReference: ModuleReference) {
    const id = StandaloneClassLoader.#moduleDescriptorId(moduleReference);
    if (!this.#moduleDescriptorMap[id]) {
      this.#moduleDescriptorMap[id] = LoaderFactory.loadModule(moduleReference);
    }

    return this.#moduleDescriptorMap[id];
  }

  getInnerObjectClass(moduleReference: ModuleReference) {
    const descriptor = this.loadModule(moduleReference);
    return descriptor.innerObjectClazzList;
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

  static #moduleDescriptorId(moduleReference: ModuleReference): string {
    return `${moduleReference.name}@${moduleReference.path}`;
  }
}
