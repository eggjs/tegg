import { GraphNode, GraphNodeObj, EdgeMeta } from '@eggjs/tegg-common-util';
import { ProtoDependencyMeta, ProtoNode } from './ProtoNode';
import { ProtoDescriptor } from '@eggjs/tegg-types';

export interface GlobalModuleNodeOptions {
  name: string;
  unitPath: string;
  optional: boolean;
}

export class ModuleDependencyMeta implements EdgeMeta {
  constructor(readonly obj: ProtoDescriptor, readonly injectObj: PropertyKey) {
  }

  equal(meta: ModuleDependencyMeta): boolean {
    return this.obj.equal(meta.obj)
      && this.injectObj === meta.injectObj;
  }

  toString(): string {
    return `Object ${String(this.obj.name)} inject ${String(this.injectObj)}`;
  }
}

export class GlobalModuleNode implements GraphNodeObj {
  readonly id: string;
  readonly name: string;
  readonly unitPath: string;
  readonly optional: boolean;
  readonly protos: GraphNode<ProtoNode, ProtoDependencyMeta>[];

  constructor(options: GlobalModuleNodeOptions) {
    this.id = options.unitPath;
    this.name = options.name;
    this.unitPath = options.unitPath;
    this.optional = options.optional;
    this.protos = [];
  }

  addProto(proto: ProtoDescriptor) {
    this.protos.push(new GraphNode(new ProtoNode(proto)));
  }

  toString() {
    return `${this.name}@${this.unitPath}`;
  }
}
