// use @eggjs/tegg as namespace
// eslint-disable-next-line import/no-unresolved
import type { Events } from '@eggjs/tegg';
import assert from 'node:assert';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { EventInfoUtil } from './EventInfoUtil.js';

export interface IEventContext {
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
