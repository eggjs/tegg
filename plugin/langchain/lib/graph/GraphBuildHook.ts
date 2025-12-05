import { AbstractStateGraph } from '@eggjs/tegg-langchain-decorator';
import { LangGraphTracer } from '../tracing/LangGraphTracer';
import { ClassProtoDescriptor, GlobalGraph } from '@eggjs/tegg-metadata';

export function GraphBuildHook(globalGraph: GlobalGraph) {
  let langchainGraphTracerProtoNode;
  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const protoNode of moduleNode.val.protos) {
      if ((protoNode.val.proto as ClassProtoDescriptor)?.clazz && (LangGraphTracer.isPrototypeOf((protoNode.val.proto as ClassProtoDescriptor).clazz) || (protoNode.val.proto as ClassProtoDescriptor).clazz === LangGraphTracer)) {
        langchainGraphTracerProtoNode = protoNode;
      }
    }
  }

  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const protoNode of moduleNode.val.protos) {
      if (
        (protoNode.val.proto as ClassProtoDescriptor)?.clazz && AbstractStateGraph.isPrototypeOf((protoNode.val.proto as ClassProtoDescriptor).clazz)
      ) {
        globalGraph.addInject(
          moduleNode,
          protoNode,
          langchainGraphTracerProtoNode,
          langchainGraphTracerProtoNode.val.proto.name,
        );
      }
    }
  }
}
