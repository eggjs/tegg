import {
  ContextHandler,
  EggContainerFactory,
  EggContext,
  EggObject,
  EggObjectStatus,
} from '@eggjs/tegg-runtime';
import { EggObjectName, EggPrototypeName, Id, IdenticalUtil, ModuleConfig } from '@eggjs/tegg';
import { CompiledStateGraphProto } from './CompiledStateGraphProto';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ChatCheckpointSaverInjectName, ChatCheckpointSaverQualifierAttribute, GRAPH_EDGE_METADATA, GRAPH_NODE_METADATA, GraphEdgeMetadata, GraphMetadata, GraphNodeMetadata, IGraph, IGraphEdge, IGraphNode, TeggToolNode } from '@eggjs/tegg-langchain-decorator';
import { LangGraphTracer } from '../tracing/LangGraphTracer';
import { BaseCheckpointSaver, CompiledStateGraph } from '@langchain/langgraph';
import { Application, Context } from 'egg';
import { ModuleConfigUtil, TimerUtil } from '@eggjs/tegg-common-util';
import { LangChainConfigSchemaType } from 'typings';
import pathToRegexp from 'path-to-regexp';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Readable, Transform } from 'node:stream';

export class CompiledStateGraphObject implements EggObject {
  private status: EggObjectStatus = EggObjectStatus.PENDING;
  id: Id;
  readonly name: EggPrototypeName;
  readonly proto: CompiledStateGraphProto;
  readonly ctx: EggContext;
  readonly daoName: string;
  _obj: object;
  readonly graphMetadata: GraphMetadata;
  readonly graphName: string;
  readonly app: Application;

  constructor(name: EggObjectName, proto: CompiledStateGraphProto, app: Application) {
    this.name = name;
    this.proto = proto;
    this.ctx = ContextHandler.getContext()!;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
    this.graphMetadata = proto.graphMetadata;
    this.graphName = proto.graphName;
    this.app = app;
  }

  async init() {
    this._obj = await this.build();
    const graph = this._obj as CompiledStateGraph<any, any>;

    const originalInvoke = graph.invoke;
    const langGraphTraceObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(LangGraphTracer);
    const tracer = langGraphTraceObj.obj as LangGraphTracer;
    tracer.setName(this.graphName);
    graph.invoke = async (input: any, config?: any) => {
      if (config?.tags?.includes('trace-log')) {
        config.callbacks = [ tracer, ...(config?.callbacks || []) ];
      }
      return await originalInvoke.call(graph, input, config);
    };

    await this.boundByConfig();

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

  async boundByConfig() {
    const config = ModuleConfigUtil.loadModuleConfigSync(this.proto.unitPath) as ModuleConfig | undefined;
    const agents: LangChainConfigSchemaType['agents'] = config?.langchain?.agents ?? [];
    const configName = `${this.graphName.slice(0, 1).toUpperCase()}${this.graphName.slice(1)}`;
    if (Object.keys(agents).includes(configName)) {
      const { path: methodRealPath, type, stream, timeout } = agents[configName];

      if ((type ?? '').toLocaleLowerCase() === 'http') {
        const router = this.app.router;
        const regExp = pathToRegexp(methodRealPath!, {
          sensitive: true,
        });
        const handler = this.createHttpHandler(stream, timeout);
        Reflect.apply(router.post, router,
          [ `${this.graphName}.Invoke`, methodRealPath, ...[], handler ]);
        this.app.rootProtoManager.registerRootProto('AgentControllerInvoke', (ctx: Context) => {
          if (regExp.test(ctx.path)) {
            return this.proto;
          }
        }, '');
      }
    }
  }

  createHttpHandler(stream?: boolean, timeout?: number) {
    const self = this;
    return async function(ctx: Context) {
      const invokeFunc = (self._obj as CompiledStateGraph<any, any>).invoke;
      const streamFunc = (self._obj as CompiledStateGraph<any, any>).stream;
      const args = ctx.request.body;
      const genArgs = Object.entries(args).reduce((acc, [ key, value ]) => {
        if (Array.isArray(value) && typeof value[0] === 'object') {
          acc[key] = value.map(obj => {
            switch (obj.role) {
              case 'human':
                return new HumanMessage(obj);
              case 'ai':
                return new AIMessage(obj);
              case 'system':
                return new SystemMessage(obj);
              case 'tool':
                return new ToolMessage(obj);
              default:
                throw new Error('unknown message type');
            }
          });
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});

      const defaultConfig = {
        configurable: {
          thread_id: process.pid.toString(),
        },
      };

      let body: unknown;
      try {
        body = await TimerUtil.timeout<unknown>(() => Reflect.apply(stream ? streamFunc : invokeFunc, (self._obj as CompiledStateGraph<any, any>), [ genArgs, defaultConfig ]), timeout);
      } catch (e: any) {
        if (e instanceof TimerUtil.TimeoutError) {
          ctx.logger.error(`timeout after ${timeout}ms`);
          ctx.throw(500, 'timeout');
        }
        throw e;
      }

      // https://github.com/koajs/koa/blob/master/lib/response.js#L88
      // ctx.status is set
      const explicitStatus = (ctx.response as any)._explicitStatus;

      if (
        // has body
        body != null ||
        // status is not set and has no body
        // code should by 204
        // https://github.com/koajs/koa/blob/master/lib/response.js#L140
        !explicitStatus
      ) {
        ctx.body = body;
        if (stream) {
          ctx.set({
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'transfer-encoding': 'chunked',
            'X-Accel-Buffering': 'no',
          });
          const transformStream = new Transform({
            objectMode: true,
            transform(chunk: any, _encoding: string, callback) {
              try {
                // 如果 chunk 是对象，转换为 JSON
                let data: string;
                if (typeof chunk === 'string') {
                  data = chunk;
                } else if (typeof chunk === 'object') {
                  data = JSON.stringify(chunk);
                } else {
                  data = String(chunk);
                }

                // 格式化为 SSE 格式
                const sseFormatted = `data: ${data}\n\n`;
                callback(null, sseFormatted);
              } catch (error) {
                callback(error);
              }
            },
          });
          ctx.body = Readable.fromWeb(body as any, { objectMode: true }).pipe(transformStream);
        } else {
          ctx.body = body;
        }
      }
    };
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

  static createObject(app: Application) {
    return async function(name: EggObjectName, proto: EggPrototype): Promise<CompiledStateGraphObject> {
      const compiledStateGraphObject = new CompiledStateGraphObject(name, proto as CompiledStateGraphProto, app);
      await compiledStateGraphObject.init();
      return compiledStateGraphObject;
    };
  }
}
