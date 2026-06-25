import { AccessLevel, EggProtoImplClass, PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { LoggerMetaUtil } from '../logger/LoggerUtil';
import { ILogger } from '../type/ILogger';
import { LoggerDecoratorParams } from '../type/LoggerDecoratorParams';

/**
 * Logger Decorator
 *
 * Define the object is Logger object
 */
export function LoggerDecorator(params?: LoggerDecoratorParams) {
  return function(constructor: EggProtoImplClass<ILogger>) {
    LoggerMetaUtil.setLoggerFlag(constructor);
    LoggerMetaUtil.setLoggerMeta(constructor, params);
    const func = SingletonProto({
      accessLevel: AccessLevel.PRIVATE,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
