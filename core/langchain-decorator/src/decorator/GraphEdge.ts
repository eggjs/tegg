import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
} from '@eggjs/tegg';
import { StackUtil } from '@eggjs/tegg-common-util';

import { IGraphEdgeMetadata } from '../model/GraphEdgeMetadata';
import { GraphEdgeInfoUtil } from '../util/GraphEdgeInfoUtil';
import { AnnotationRoot, StateDefinition, UpdateType } from '@langchain/langgraph';

/**
 * @description GraphEdge decorator
 * @param {IGraphEdgeMetadata} params
 * @example
 * ```ts
 * @GraphEdge({
 *   fromNodeName: 'start', // 标记启动点，如果只有 fromNodeName 和 toNodeNames，那么就是单向边
 *   toNodeNames: ['end'], // 标记结束点，可以是多个，多个的时候就必须要实现 execute
 * })
 * ```
 * @return {Function}
 */
export function GraphEdge<S extends StateDefinition = StateDefinition, N extends string = '__start__' | '__end__'>(params: IGraphEdgeMetadata) {
  return (constructor: EggProtoImplClass<IGraphEdge<S, N>>) => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    GraphEdgeInfoUtil.setGraphEdgeMetadata(params, constructor);
  };
}

export type GraphStateType<A extends StateDefinition = StateDefinition> = AnnotationRoot<A>['State'];

export type GraphUpdateType<A extends StateDefinition = StateDefinition> = UpdateType<A>;

export interface IGraphEdge<S extends StateDefinition = StateDefinition, N extends string = '__start__' | '__end__'> {
  execute?(state: AnnotationRoot<S>['State']): Promise<N | N[]>;
}
