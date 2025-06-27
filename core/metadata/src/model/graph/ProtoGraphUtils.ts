import {
  InitTypeQualifierAttribute,
  InjectObjectDescriptor,
  LoadUnitNameQualifierAttribute,
  ObjectInitType,
  ProtoDescriptor,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { GraphNode } from '@eggjs/tegg-common-util';
import { ProtoDependencyMeta, ProtoGraph, ProtoGraphNode, ProtoNode } from './ProtoNode';
import { FrameworkErrorFormater } from 'egg-errors';
import { MultiPrototypeFound } from '../../errors';
import { QualifierUtil } from '@eggjs/core-decorator';
import { ProtoSelectorContext } from './ProtoSelector';

export class ProtoGraphUtils {
  static findDependencyProtoNode(graph: ProtoGraph, proto: ProtoDescriptor, injectObject: InjectObjectDescriptor): ProtoGraphNode | undefined {
    // 1. find proto with request
    // 2. try to add Context qualifier to find
    // 3. try to add self init type qualifier to find
    const protos = ProtoGraphUtils.#findDependencyProtoWithDefaultQualifiers(graph, proto, injectObject, []);
    if (protos.length === 0) {
      return;
      // throw FrameworkErrorFormater.formatError(new EggPrototypeNotFound(injectObject.objName, proto.instanceModuleName));
    }
    if (protos.length === 1) {
      return protos[0];
    }

    const protoWithContext = ProtoGraphUtils.#findDependencyProtoWithDefaultQualifiers(graph, proto, injectObject, [{
      attribute: InitTypeQualifierAttribute,
      value: ObjectInitType.CONTEXT,
    }]);
    if (protoWithContext.length === 1) {
      return protoWithContext[0];
    }

    const protoWithSelfInitType = ProtoGraphUtils.#findDependencyProtoWithDefaultQualifiers(graph, proto, injectObject, [{
      attribute: InitTypeQualifierAttribute,
      value: proto.initType,
    }]);
    if (protoWithSelfInitType.length === 1) {
      return protoWithSelfInitType[0];
    }
    const loadUnitQualifier = injectObject.qualifiers.find(t => t.attribute === LoadUnitNameQualifierAttribute);
    if (!loadUnitQualifier) {
      return ProtoGraphUtils.findDependencyProtoNode(graph, proto, {
        ...injectObject,
        qualifiers: QualifierUtil.mergeQualifiers(
          injectObject.qualifiers,
          [{
            attribute: LoadUnitNameQualifierAttribute,
            value: proto.instanceModuleName,
          }],
        ),
      });
    }
    throw FrameworkErrorFormater.formatError(new MultiPrototypeFound(injectObject.objName, injectObject.qualifiers));
  }

  static #findDependencyProtoWithDefaultQualifiers(graph: ProtoGraph, proto: ProtoDescriptor, injectObject: InjectObjectDescriptor, qualifiers: QualifierInfo[]): GraphNode<ProtoNode, ProtoDependencyMeta>[] {
    // TODO perf O(n(proto count)*m(inject count)*n)
    const result: GraphNode<ProtoNode, ProtoDependencyMeta>[] = [];
    for (const node of graph.nodes.values()) {
      const ctx: ProtoSelectorContext = {
        name: injectObject.objName,
        qualifiers: QualifierUtil.mergeQualifiers(injectObject.qualifiers, qualifiers),
        moduleName: proto.instanceModuleName,
      };
      if (node.val.selectProto(ctx)) {
        result.push(node);
      }
    }
    return result;
  }
}
