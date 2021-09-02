import { Context } from 'egg';
import { AccessLevel, PrototypeUtil, ContextProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { RocketMQMetadata } from './RocketMQMetadata';
import { RocketMQMessageListenerHandler, RocketMQUtil } from './RocketMQUtil';

export function RocketMQMessageListener<Metadata extends RocketMQMetadata>(property: Metadata) {
  return function(clazz: new (ctx: Context) => RocketMQMessageListenerHandler) {
    RocketMQUtil.setProperty(property, clazz);
    const func = ContextProto({
      accessLevel: AccessLevel.PUBLIC,
    });
    func(clazz);
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 5));
  };
}
