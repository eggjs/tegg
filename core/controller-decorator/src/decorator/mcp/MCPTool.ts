import {
  ControllerType,
  EggProtoImplClass,
  MCPToolParams,
} from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCPInfoUtil } from '../../../src/util/MCPInfoUtil';
import MethodInfoUtil from '../../../src/util/MethodInfoUtil';

export function MCPTool(params?: MCPToolParams) {
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
    MCPInfoUtil.setMCPToolParams(
      {
        ...params,
        mcpName: params?.name,
        name: methodName,
      },
      controllerClazz,
      methodName,
    );
    MCPInfoUtil.setMCPTool(controllerClazz, methodName);
  };
}

export function ToolArgsSchema(argsSchema: Parameters<McpServer['tool']>['2']) {
  return function(
    target: any,
    propertyKey: PropertyKey,
    parameterIndex: number,
  ) {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MCPInfoUtil.setMCPToolArgsInArgs(
      {
        argsSchema,
        index: parameterIndex,
      },
      controllerClazz,
      methodName,
    );
  };
}
