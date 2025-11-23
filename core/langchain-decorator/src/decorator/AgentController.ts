import { StackUtil } from '@eggjs/tegg-common-util';
import {
  AccessLevel,
  SingletonProto,
  PrototypeUtil,
  EggProtoImplClass,
  ControllerInfoUtil,
  ControllerType,
} from '@eggjs/tegg';

import { IAgentControllerMetadata } from '../model/AgentControllerMetadata';
import { AgentControllerInfoUtil } from '../util/AgentControllerInfoUtil';
import { AbstractStateGraph } from './Graph';
import assert from 'node:assert';

export function AgentController(params: IAgentControllerMetadata) {
  return (constructor: EggProtoImplClass) => {
    assert(constructor.prototype instanceof AbstractStateGraph, 'AgentController must be extends AbstractStateGraph');
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
      name: params?.protoName,
    });
    func(constructor);
    ControllerInfoUtil.setControllerType(constructor, ControllerType.AGENT);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
    if (params?.controllerName) {
      ControllerInfoUtil.setControllerName(constructor, params.controllerName);
    }

    AgentControllerInfoUtil.setAgentControllerMetadata(params, constructor);
  };
}
