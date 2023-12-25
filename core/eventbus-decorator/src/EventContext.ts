// use @eggjs/tegg as namespace
// eslint-disable-next-line import/no-unresolved
import { Events } from '@eggjs/tegg';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import assert from 'assert';
import { EventInfoUtil } from './EventInfoUtil';

export interface IEventContext{
  eventName: keyof Events
}

export function EventContext() {
  return function(target: any, propertyKey: PropertyKey, parameterIndex: number) {
    assert(propertyKey === 'handle',
      `[eventHandler ${target.name}] expect method name be handle, but now is ${String(propertyKey)}`);
    assert(parameterIndex === 0,
      `[eventHandler ${target.name}] expect param EventContext be the first param`);
    const clazz = target.constructor as EggProtoImplClass;
    EventInfoUtil.setEventHandlerContextInject(true, clazz);
  };
}
