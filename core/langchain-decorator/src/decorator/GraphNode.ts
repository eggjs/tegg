import { StackUtil } from '@eggjs/tegg-common-util';
import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
} from '@eggjs/tegg';

import { IGraphNodeMetadata } from '../model/GraphNodeMetadata';
import { GraphNodeInfoUtil } from '../util/GraphNodeInfoUtil';
import { AnnotationRoot, Runtime, StateDefinition, StateGraph, UpdateType } from '@langchain/langgraph';
import { ConfigurableModel } from 'langchain/chat_models/universal';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseChatOpenAI } from '@langchain/openai';

export function GraphNode<S extends StateDefinition = StateDefinition>(params: IGraphNodeMetadata) {
  return (constructor: EggProtoImplClass<IGraphNode<S> | TeggToolNode>) => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    GraphNodeInfoUtil.setGraphNodeMetadata(params, constructor);
  };
}

export type StateGraphAddNodeOptions = Parameters<typeof StateGraph['prototype']['addNode']>[2];

export type GraphRuntime<ContextType = Record<string, unknown>, InterruptType = any, WriterType = any> = Runtime<ContextType, InterruptType, WriterType>;

export interface IGraphNode<S extends StateDefinition = StateDefinition, T = any> {

  options?: StateGraphAddNodeOptions;
  execute(state: AnnotationRoot<S>['State'], options?: GraphRuntime): Promise<UpdateType<S> & Record<string, any>> | Promise<ToolNode<T>>;
  build?: (tools: Parameters<ConfigurableModel['bindTools']>['0']) => Promise<ReturnType<ConfigurableModel['bindTools']> | ReturnType<BaseChatOpenAI<any>['bindTools']>>;
}

export class TeggToolNode implements IGraphNode {
  toolNode: ToolNode;

  async execute() {
    return this.toolNode;
  }
}
