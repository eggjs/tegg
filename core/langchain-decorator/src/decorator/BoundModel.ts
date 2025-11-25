import { StackUtil } from '@eggjs/tegg-common-util';
import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
} from '@eggjs/tegg';

import { IBoundModelMetadata } from '../model/BoundModelMetadata';
import { BoundModelInfoUtil } from '../util/BoundModelInfoUtil';
import { BaseChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';


export function BoundModel(params: IBoundModelMetadata) {
  return (constructor: EggProtoImplClass) => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    BoundModelInfoUtil.setBoundModelMetadata(params, constructor);
  };
}

type BaseChatModel<T extends ChatOpenAICallOptions = ChatOpenAICallOptions> = InstanceType<typeof BaseChatOpenAI<T>> extends infer C
  ? C : never;

export type TeggBoundModel<S, CallOptions extends ChatOpenAICallOptions = ChatOpenAICallOptions> = S & ReturnType<NonNullable<BaseChatModel<CallOptions>['bindTools']>>;

