// import type { EggProtoImplClass } from '@alipay/tegg-types';

import { StackUtil } from '@eggjs/tegg-common-util';
import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
} from '@eggjs/tegg';

import { IGraphNodeMetadata } from '../model/GraphNodeMetadata';
import { GraphNodeInfoUtil } from '../util/GraphNodeInfoUtil';
import { AnnotationRoot, StateDefinition, UpdateType } from '@langchain/langgraph';
import { ConfigurableModel } from 'langchain/dist/chat_models/universal.js';
import { ToolNode } from '@langchain/langgraph/dist/prebuilt';

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

export interface IGraphNode<S extends StateDefinition = StateDefinition, T = any> {

  // execute(state: T extends AbstractStateGraph<infer S> ? GraphStateType<S> : never): Promise<GraphUpdateType<T> extends object ? GraphUpdateType<T> & Record<string, any> : GraphUpdateType<T>>;
  execute(state: AnnotationRoot<S>['State']): Promise<UpdateType<S> & Record<string, any>> | Promise<ToolNode<T>>;

  build?: (tools: Parameters<ConfigurableModel['bindTools']>['0']) => Promise<ConfigurableModel>;
}

export class TeggToolNode implements IGraphNode {
  toolNode: ToolNode;

  async execute() {
    return this.toolNode;
  }
}
