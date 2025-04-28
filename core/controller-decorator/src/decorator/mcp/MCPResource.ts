import {
  ControllerType,
  EggProtoImplClass,
  MCPResourceParams,
} from '@eggjs/tegg-types';
import { MCPInfoUtil } from '../../../src/util/MCPInfoUtil';
import MethodInfoUtil from '../../../src/util/MethodInfoUtil';

export function MCPResource(params: MCPResourceParams) {
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
    MCPInfoUtil.setMCPResourceParams(
      {
        ...params,
        mcpName: params.name,
        name: methodName,
      },
      controllerClazz,
      methodName,
    );
    MCPInfoUtil.setMCPResource(controllerClazz, methodName);
  };
}
