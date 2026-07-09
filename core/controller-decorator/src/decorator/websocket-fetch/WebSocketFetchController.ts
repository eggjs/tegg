import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass, WebSocketFetchControllerParams } from '@eggjs/tegg-types';
import { AccessLevel, ControllerType } from '@eggjs/tegg-types';
import ControllerInfoUtil from '../../util/ControllerInfoUtil';
import WebSocketInfoUtil from '../../util/WebSocketInfoUtil';

export function WebSocketFetchController(param?: WebSocketFetchControllerParams) {
  return function(constructor: EggProtoImplClass) {
    ControllerInfoUtil.setControllerType(constructor, ControllerType.WEBSOCKET_FETCH);
    if (param?.controllerName) {
      ControllerInfoUtil.setControllerName(constructor, param.controllerName);
    }
    if (param?.path) {
      WebSocketInfoUtil.setWebSocketPath(param.path, constructor);
    }

    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
      name: param?.protoName,
    });
    func(constructor);

    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
