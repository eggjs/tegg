import { AccessLevel, ContextProto, EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import HTTPInfoUtil from '../../util/HTTPInfoUtil';
import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import { ControllerType } from '../../model';

export interface HTTPControllerParams {
  protoName?: string;
  controllerName?: string;
  path?: string;
}

export function HTTPController(param?: HTTPControllerParams) {
  return function(constructor: EggProtoImplClass) {
    ControllerInfoUtil.setControllerType(constructor, ControllerType.HTTP);
    if (param?.controllerName) {
      ControllerInfoUtil.setControllerName(constructor, param?.controllerName);
    }
    if (param?.path) {
      HTTPInfoUtil.setHTTPPath(param.path, constructor);
    }
    // TODO elegant?
    const func = ContextProto({
      accessLevel: AccessLevel.PUBLIC,
      name: param?.protoName,
    });
    func(constructor);

    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/controller-decorator/src/decorator/http/HTTPController.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/controller-decorator/test/fixtures/TRFooController.ts',
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
