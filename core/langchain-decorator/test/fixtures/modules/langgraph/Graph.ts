import { Graph, GraphEdge, IGraphEdge, AbstractStateGraph, GraphNode, IGraphNode, GraphStateType, GraphTool, IGraphTool, ChatModelQualifier, TeggCompiledStateGraph, TeggToolNode, BoundModel, TeggBoundModel } from '../../../..';
import { Annotation, MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { Inject, SingletonProto } from '@eggjs/core-decorator';
import { BaseMessage } from '@langchain/core/dist/messages/base';
import { AccessLevel, ToolArgs } from '@eggjs/tegg-types';
import { ToolArgsSchema } from '@eggjs/controller-decorator';
import { AIMessage } from '@langchain/core/dist/messages/ai';

export enum FooGraphNodeName {
  START = '__start__',
  END = '__end__',
  ACTION = 'action',
  TOOLS = 'tools',
  AGENT = 'agent',
  NODE_A = 'a',
  NODE_B = 'b',
  NODE_C = 'c',
  NODE_D = 'd',
}

@SingletonProto()
export class FooSaver extends MemorySaver {}

// state
export const fooAnnotationStateDefinition = {
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  aggregate: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
  }),
};

export type FooAnnotationStateDefinition = typeof fooAnnotationStateDefinition;

export const ToolType = {
  query: z.string({
    description: 'npm package name',
  }),
};

@GraphTool({
  toolName: 'foo',
  description: 'Call the foo tool',
})
export class FooTool implements IGraphTool {

  async execute(@ToolArgsSchema(ToolType) args: ToolArgs<typeof ToolType>) {
    console.log('query: ', args.query);
    return 'It\'s sunny in San Francisco, but you better look out if you\'re a Gemini 😈.';
  }
}

@BoundModel({
  modelName: 'chat',
  tools: [ FooTool ],
  mcpServers: [ 'fooMcpServer' ],
})
export class FooChatModel {}

@GraphNode({
  nodeName: FooGraphNodeName.TOOLS,
  tools: [ FooTool ],
  mcpServers: [ 'fooMcpServer' ],
})
export class ToolNode extends TeggToolNode {}


@GraphNode({
  nodeName: FooGraphNodeName.ACTION,
  tools: [ FooTool ],
  mcpServers: [ 'fooMcpServer' ],
})
export class FooNode implements IGraphNode<FooAnnotationStateDefinition> {

  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAI;

  async execute(
    state: GraphStateType<FooAnnotationStateDefinition>,
  ) {
    console.log('start call model');
    const response = await this.chatModel.invoke(state.messages);
    console.log('response: ', response);
    return { messages: [ response ] };
  }
}

@GraphEdge({
  fromNodeName: FooGraphNodeName.ACTION,
  toNodeNames: [ FooGraphNodeName.END, FooGraphNodeName.ACTION ],
})
export class FooContinueEdge implements IGraphEdge<FooAnnotationStateDefinition, FooGraphNodeName> {

  async execute(
    state: GraphStateType<FooAnnotationStateDefinition>,
  ): Promise<FooGraphNodeName> {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && !(lastMessage as AIMessage).tool_calls?.length) {
      return FooGraphNodeName.END;
    }
    return FooGraphNodeName.ACTION;
  }
}


@Graph({
  accessLevel: AccessLevel.PUBLIC,
  nodes: [ FooNode ],
  edges: [ FooContinueEdge ],
  checkpoint: FooSaver,
})
export class FooGraph extends AbstractStateGraph<FooGraphNodeName, typeof fooAnnotationStateDefinition> {
  constructor() {
    super(fooAnnotationStateDefinition);
  }
}

// 手动挡
@GraphNode({
  nodeName: FooGraphNodeName.ACTION,
})
export class BarNode implements IGraphNode<FooAnnotationStateDefinition> {

  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAI;

  @Inject()
  fooTool: FooTool;

  async execute(
    state: GraphStateType<FooAnnotationStateDefinition>,
  ) {
    console.log('start call model');
    const response = await this.chatModel.invoke(state.messages);
    console.log('response: ', response);
    return { messages: [ response ] };
  }

  async build() {
    return this.chatModel.bindTools([ this.fooTool ]);
  }
}


@Graph({
  accessLevel: AccessLevel.PUBLIC,
})
export class BarGraph extends AbstractStateGraph<FooGraphNodeName, FooAnnotationStateDefinition> {
  @Inject()
  fooSaver: FooSaver;

  @Inject()
  fooContinueEdge: FooContinueEdge;

  @Inject()
  barNode: BarNode;

  @Inject()
  fooChatModel: TeggBoundModel<FooChatModel>;

  constructor() {
    super(fooAnnotationStateDefinition);
  }

  async build() {
    this.addNode(FooGraphNodeName.ACTION, this.barNode.execute);
    this.addConditionalEdges(FooGraphNodeName.ACTION, this.fooContinueEdge.execute);
    return this.compile({ checkpointer: this.fooSaver });
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class FooService {
  @Inject()
  fooGraph: TeggCompiledStateGraph<FooGraph>;

  async blablabla() {
    await this.fooGraph.invoke({
      messages: [],
      aggregate: [],
    });
  }
}
