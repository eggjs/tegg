import {
  ControllerType,
  EggProtoImplClass,
  MCPPromptParams,
} from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCPInfoUtil } from '../../../src/util/MCPInfoUtil';
import MethodInfoUtil from '../../../src/util/MethodInfoUtil';

export function MCPPrompt(params?: MCPPromptParams) {
  return function(
    target: any,
    propertyKey: PropertyKey,
  ) {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(
      controllerClazz,
      methodName,
      ControllerType.MCP,
    );
    MCPInfoUtil.setMCPPromptParams(
      {
        ...params,
        mcpName: params?.name,
        name: methodName,
      },
      controllerClazz,
      methodName,
    );
    MCPInfoUtil.setMCPPrompt(controllerClazz, methodName);
  };
}

export function PromptArgsSchema(argsSchema: Parameters<McpServer['prompt']>['2']) {
  return function(
    target: any,
    propertyKey: PropertyKey,
    parameterIndex: number,
  ) {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MCPInfoUtil.setMCPPromptArgsInArgs(
      {
        argsSchema,
        index: parameterIndex,
      },
      controllerClazz,
      methodName,
    );
  };
}
