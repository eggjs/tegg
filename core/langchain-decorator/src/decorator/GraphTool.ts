import { StackUtil } from '@eggjs/tegg-common-util';
import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
} from '@eggjs/tegg';

import { IGraphToolMetadata } from '../model/GraphToolMetadata';
import { GraphToolInfoUtil } from '../util/GraphToolInfoUtil';
import { DynamicStructuredTool, ToolSchemaBase } from '@langchain/core/tools';

export function GraphTool<ToolSchema = ToolSchemaBase>(params: IGraphToolMetadata) {
  return (constructor: EggProtoImplClass<IGraphTool<ToolSchema>>) => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    GraphToolInfoUtil.setGraphToolMetadata(params, constructor);
  };
}

export interface IGraphTool<ToolSchema = ToolSchemaBase> {

  execute: DynamicStructuredTool<ToolSchema>['func'];
}

export type IGraphStructuredTool<T extends IGraphTool> = DynamicStructuredTool<Parameters<T['execute']>[0]>;

