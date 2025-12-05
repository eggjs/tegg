import {
  ContextHandler,
  EggContainerFactory,
  EggContext,
  EggObject,
  EggObjectStatus,
} from '@eggjs/tegg-runtime';
import { EggObjectName, EggPrototypeName, Id, IdenticalUtil } from '@eggjs/tegg';
import { CompiledStateGraphProto } from './CompiledStateGraphProto';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ChatCheckpointSaverInjectName, ChatCheckpointSaverQualifierAttribute, GRAPH_EDGE_METADATA, GRAPH_NODE_METADATA, GraphEdgeMetadata, GraphMetadata, GraphNodeMetadata, IGraph, IGraphEdge, IGraphNode, TeggToolNode } from '@eggjs/tegg-langchain-decorator';
import { LangGraphTracer } from '../tracing/LangGraphTracer';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';

export class CompiledStateGraphObject implements EggObject {
  private status: EggObjectStatus = EggObjectStatus.PENDING;
  id: Id;
  readonly name: EggPrototypeName;
  readonly proto: CompiledStateGraphProto;
  readonly ctx: EggContext;
  readonly daoName: string;
  private _obj: object;
  readonly graphMetadata: GraphMetadata;
  readonly graphName: string;

  constructor(name: EggObjectName, proto: CompiledStateGraphProto) {
    this.name = name;
    this.proto = proto;
    this.ctx = ContextHandler.getContext()!;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
    this.graphMetadata = proto.graphMetadata;
    this.graphName = proto.graphName;
  }

  async init() {
    this._obj = await this.build();
    const graph = this._obj as CompiledStateGraph<any, any>;

    const originalInvoke = graph.invoke;
    const langGraphTraceObj = await EggContainerFactory.getOrCreateEggObjectFromName('langGraphTracer');
    const tracer = langGraphTraceObj.obj as LangGraphTracer;
    tracer.setName(this.graphName);
    graph.invoke = async (input: any, config?: any) => {
      if (config?.tags?.includes('trace-log')) {
        config.callbacks = [ tracer, ...(config?.callbacks || []) ];
      }
      return await originalInvoke.call(graph, input, config);
    };

    this.status = EggObjectStatus.READY;
  }

  async build() {
    const stateGraph = await EggContainerFactory.getOrCreateEggObjectFromName(this.graphName);
    await this.boundNodes(stateGraph);
    await this.boundEdges(stateGraph);
    const graphObj = stateGraph.obj as IGraph<any, any>;
    const checkpoint = this.graphMetadata.checkpoint;
    let compileGraph;
    if (checkpoint) {
      let checkpointObj: EggObject;
      if (typeof checkpoint !== 'string') {
        checkpointObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(checkpoint);
      } else {
        checkpointObj = await EggContainerFactory.getOrCreateEggObjectFromName(ChatCheckpointSaverInjectName, [{
          attribute: ChatCheckpointSaverQualifierAttribute,
          value: checkpoint,
        }]);
      }
      compileGraph = graphObj.compile({
        checkpointer: checkpointObj.obj as BaseCheckpointSaver,
      });
    } else {
      compileGraph = graphObj.compile();
    }
    return compileGraph;
  }

  async boundNodes(stateGraph: EggObject) {
    const graphObj = stateGraph.obj as IGraph<any, any>;
    const nodes = this.graphMetadata.nodes ?? [];
    for (let i = 0; i < nodes.length; i++) {
      const node = await EggContainerFactory.getOrCreateEggObjectFromClazz(nodes[i]);
      const nodeObj = node.obj as unknown as IGraphNode<any>;
      const nodeMetadata = node.proto.getMetaData<GraphNodeMetadata>(GRAPH_NODE_METADATA);
      if (nodeMetadata) {
        if (TeggToolNode.prototype.isPrototypeOf(nodeObj)) {
          graphObj.addNode(nodeMetadata.nodeName, (nodeObj as unknown as TeggToolNode).toolNode);
        } else {
          graphObj.addNode(nodeMetadata.nodeName, nodeObj.execute.bind(nodeObj));
        }
      }
    }
  }

  async boundEdges(stateGraph: EggObject) {
    const graphObj = stateGraph.obj as IGraph<any, any>;
    const edges = this.graphMetadata.edges ?? [];
    for (let i = 0; i < edges.length; i++) {
      const edge = await EggContainerFactory.getOrCreateEggObjectFromClazz(edges[i]);
      const edgeObj = edge.obj as unknown as IGraphEdge<any>;
      const edgeMetadata = edge.proto.getMetaData<GraphEdgeMetadata>(GRAPH_EDGE_METADATA);
      if (edgeMetadata) {
        if (edgeObj.execute) {
          graphObj.addConditionalEdges(edgeMetadata.fromNodeName, edgeObj.execute.bind(edgeObj), edgeMetadata.toNodeNames);
        } else {
          graphObj.addEdge(edgeMetadata.fromNodeName, edgeMetadata.toNodeNames[0]);
        }
      }
    }
  }

  injectProperty() {
    throw new Error('never call GraphObject#injectProperty');
  }

  get isReady() {
    return this.status === EggObjectStatus.READY;
  }

  get obj() {
    return this._obj;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<CompiledStateGraphObject> {
    const compiledStateGraphObject = new CompiledStateGraphObject(name, proto as CompiledStateGraphProto);
    await compiledStateGraphObject.init();
    return compiledStateGraphObject;
  }
}
