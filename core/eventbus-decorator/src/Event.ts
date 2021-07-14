import { AccessLevel, ContextProto, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { EventHandler } from '../index';
import { EventInfoUtil } from './EventInfoUtil';
import { Events } from '@eggjs/tegg';

export function Event<E extends keyof Events>(eventName: E) {
  return function(clazz: new () => EventHandler<E>) {
    EventInfoUtil.setEventName(eventName, clazz);
    const func = ContextProto({
      accessLevel: AccessLevel.PUBLIC,
    });
    func(clazz);
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 5));
  };
}
