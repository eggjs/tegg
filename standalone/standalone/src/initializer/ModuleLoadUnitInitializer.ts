import {
  EggLoadUnitType,
  GlobalGraph,
  GlobalModuleNode,
  LoadUnit,
  LoadUnitFactory,
} from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { StandaloneClassLoader } from '../StandaloneClassLoader';
import { ModuleReference } from '@eggjs/tegg-types';
import { Timing } from '../common/utils/Timing';

export interface ModuleLoadUnitInitializerInit {
  globalGraph?: GlobalGraph;
  classLoader: StandaloneClassLoader;
}

export class ModuleLoadUnitInitializer {
  readonly #globalGraph: GlobalGraph;
  readonly #classLoader: StandaloneClassLoader;

  constructor(init: ModuleLoadUnitInitializerInit) {
    this.#globalGraph = init.globalGraph || new GlobalGraph();
    this.#classLoader = init.classLoader;
  }

  addModule(moduleReference: ModuleReference) {
    const descriptor = this.#classLoader.loadModule(moduleReference);
    const moduleNode = new GlobalModuleNode({
      name: descriptor.name,
      unitPath: descriptor.unitPath,
      optional: descriptor.optional ?? false,
    });

    for (const clazz of descriptor.clazzList) {
      moduleNode.addProtoByClazz(clazz);
    }

    this.#globalGraph.addModuleNode(moduleNode);
  }

  #buildMultiInstanceProtos() {
    const multiInstanceClassDefinitions = this.#classLoader.getMultiInstanceClassDefinitions();
    for (const definition of multiInstanceClassDefinitions) {
      for (const moduleNode of this.#globalGraph.moduleGraph.nodes.values()) {
        const added = moduleNode.val.addProtoByMultiInstanceClazz(definition.clazz, definition.defineModuleName, definition.defineUnitPath);

        for (const protoNode of added) {
          this.#globalGraph.addProtoNode(protoNode);
        }
      }
    }
  }

  #buildGlobalGraph() {
    this.#buildMultiInstanceProtos();
    this.#globalGraph.build();
    this.#globalGraph.sort();
    return this.#globalGraph.moduleConfigList;
  }

  async createModuleLoadUnits() {
    const moduleReferences = Timing.profile(() => this.#buildGlobalGraph(), 'buildGlobalGraph');

    const loadUnits: LoadUnit[] = [];
    for (const reference of moduleReferences) {
      const modulePath = reference.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }

    return loadUnits;
  }
}
