import { Graph, GraphNode, ModuleReference } from '@eggjs/tegg-common-util';
import {
  LoadUnitFactory,
  ProtoDependencyMeta,
  ProtoDescriptorHelper,
  ProtoGraphUtils,
  ProtoNode,
} from '@eggjs/tegg-metadata';
import { StandaloneClassLoader } from '../StandaloneClassLoader';
import { InnerObject } from '../common/types';
import { StandaloneLoadUnitName, StandaloneLoadUnitPath, StandaloneLoadUnitType } from '../common/constant';
import { StandaloneLoadUnit } from './StandaloneLoadUnit';
import { EggProtoImplClass } from '@eggjs/tegg-types';

export interface StandaloneLoadUnitInitializerOptions {
  classLoader: StandaloneClassLoader;
}

export interface CreateStandaloneLoadUnitOptions {
  innerObjects: Record<string, InnerObject[]>;
}

export class StandaloneLoadUnitInitializer {
  readonly #protoGraph: Graph<ProtoNode, ProtoDependencyMeta>;
  readonly #classLoader: StandaloneClassLoader;

  constructor(opts: StandaloneLoadUnitInitializerOptions) {
    this.#protoGraph = new Graph<ProtoNode, ProtoDependencyMeta>();
    this.#classLoader = opts.classLoader;
  }

  addInnerObjectProto(moduleReference: ModuleReference) {
    const classList = this.#classLoader.getInnerObjectClass(moduleReference);
    for (const clazz of classList) {
      const descriptor = ProtoDescriptorHelper.createByInstanceClazz(clazz, {
        moduleName: StandaloneLoadUnitName,
        unitPath: StandaloneLoadUnitPath,
        defineModuleName: moduleReference.name,
        defineUnitPath: moduleReference.path,
      });
      const protoGraphNode = new GraphNode<ProtoNode, ProtoDependencyMeta>(new ProtoNode(descriptor));
      this.#protoGraph.addVertex(protoGraphNode);
    }
  }

  #buildProtoGraph() {
    for (const protoNode of this.#protoGraph.nodes.values()) {
      for (const injectObj of protoNode.val.proto.injectObjects) {
        const injectProto = ProtoGraphUtils.findDependencyProtoNode(this.#protoGraph, protoNode.val.proto, injectObj);
        if (!injectProto) {
          continue;
        }
        this.#protoGraph.addEdge(protoNode, protoNode, new ProtoDependencyMeta({ injectObj: injectObj.objName }));
      }
    }
    const loopPath = this.#protoGraph.loopPath();
    if (loopPath) {
      throw new Error('innerObjectProto has recursive deps: ' + loopPath);
    }

    return this.#protoGraph.sort();
  }

  async createLoadUnit(opts: CreateStandaloneLoadUnitOptions) {
    const protos = this.#buildProtoGraph().map(n => n.val.proto);
    LoadUnitFactory.registerLoadUnitCreator(StandaloneLoadUnitType, () => {
      return new StandaloneLoadUnit({
        innerObject: opts.innerObjects,
        protos,
      });
    });

    return await LoadUnitFactory.createLoadUnit('MockStandaloneLoadUnitPath', StandaloneLoadUnitType, {
      load(): EggProtoImplClass[] {
        return [];
      },
    });
  }
}
