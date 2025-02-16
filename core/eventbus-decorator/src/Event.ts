import { AccessLevel, PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { EventHandler } from './EventBus.js';
import { EventInfoUtil } from './EventInfoUtil.js';
// use @eggjs/tegg as namespace
// eslint-disable-next-line import/no-unresolved
import type { Events } from '@eggjs/tegg';

export function Event<E extends keyof Events>(eventName: E) {
  return function(clazz: new () => EventHandler<E>) {
    EventInfoUtil.addEventName(eventName, clazz);
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
    });
    func(clazz);
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 5));
  };
}
