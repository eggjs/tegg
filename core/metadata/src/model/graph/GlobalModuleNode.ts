import { GraphNode, GraphNodeObj, EdgeMeta } from '@eggjs/tegg-common-util';
import { ProtoDependencyMeta, ProtoGraphNode, ProtoNode } from './ProtoNode';
import { EggProtoImplClass, ProtoDescriptor } from '@eggjs/tegg-types';
import { ProtoDescriptorHelper } from '../ProtoDescriptorHelper';

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
  readonly protos: ProtoGraphNode[];

  constructor(options: GlobalModuleNodeOptions) {
    this.id = options.unitPath;
    this.name = options.name;
    this.unitPath = options.unitPath;
    this.optional = options.optional;
    this.protos = [];
  }

  addProtoByClazz(clazz: EggProtoImplClass) {
    const proto = ProtoDescriptorHelper.createByInstanceClazz(clazz, {
      moduleName: this.name,
      unitPath: this.unitPath,
    });
    return this.addProto(proto);
  }

  addProtoByMultiInstanceClazz(clazz: EggProtoImplClass, defineModuleName: string, defineUnitPath: string) {
    const protos = ProtoDescriptorHelper.createByMultiInstanceClazz(clazz, {
      moduleName: this.name,
      unitPath: this.unitPath,
      defineModuleName,
      defineUnitPath,
    });
    const result: ProtoGraphNode[] = [];
    for (const proto of protos) {
      result.push(this.addProto(proto));
    }
    return result;
  }

  addProto(proto: ProtoDescriptor) {
    const protoGraphNode = new GraphNode<ProtoNode, ProtoDependencyMeta>(new ProtoNode(proto));
    this.protos.push(protoGraphNode);
    return protoGraphNode;
  }

  toString() {
    return `${this.name}@${this.unitPath}`;
  }
}
