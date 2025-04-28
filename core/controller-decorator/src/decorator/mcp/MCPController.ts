import { ControllerType, MCPControllerParams, AccessLevel, EggProtoImplClass } from '@eggjs/tegg-types';
import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { StackUtil } from '@eggjs/tegg-common-util';
import { MCPInfoUtil } from '../../../src/util/MCPInfoUtil';

export function MCPController(param?: MCPControllerParams) {
  return function(constructor: EggProtoImplClass) {
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
      name: param?.protoName,
    });
    func(constructor);
    ControllerInfoUtil.setControllerType(constructor, ControllerType.MCP);
    if (param?.controllerName) {
      ControllerInfoUtil.setControllerName(constructor, param?.controllerName);
    }
    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/controller-decorator/src/decorator/tr/TRController.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/controller-decorator/test/fixtures/TRFooController.ts',
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    if (param?.name) {
      MCPInfoUtil.setMCPName(param.name, constructor);
    }
    if (param?.version) {
      MCPInfoUtil.setMCPVersion(param.version, constructor);
    }
  };
}
