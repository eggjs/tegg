import { AnnotationRoot, CompiledStateGraph, StateDefinition, StateGraph, StateType, UpdateType } from '@langchain/langgraph';
import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
} from '@eggjs/tegg';

import { IGraphMetadata } from '../model/GraphMetadata';
import { GraphInfoUtil } from '../util/GraphInfoUtil';
import { StackUtil } from '@eggjs/tegg-common-util';
export function Graph<N extends string = '', S extends StateDefinition = StateDefinition>(params: IGraphMetadata) {
  return (constructor: EggProtoImplClass<AbstractStateGraph<N, S>>) => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    GraphInfoUtil.setGraphMetadata(params, constructor);
  };
}

export interface IGraph<N extends string = '', S extends StateDefinition = StateDefinition> extends StateGraph<S, AnnotationRoot<S>['State'], UpdateType<S>, N> {
  build?(): Promise<CompiledStateGraph<StateType<StateDefinition>, UpdateType<StateDefinition>, string, StateDefinition, StateDefinition, StateDefinition> | undefined>;
}

export abstract class AbstractStateGraph<N extends string = '', S extends StateDefinition = StateDefinition> extends StateGraph<S, AnnotationRoot<S>['State'], UpdateType<S>, N> implements IGraph<N, S> {

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private _names: N;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private _state: S;
}

export type TeggCompiledStateGraph<G> = G extends AbstractStateGraph<infer N, infer S> ? CompiledStateGraph<StateType<S>, UpdateType<S>, N, S, S> : never;
