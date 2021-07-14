import TypedEventEmitter, { Arguments } from 'typed-emitter';
import { Events } from '@eggjs/tegg';

export type EventName = string | symbol;

/**
 * use `emit` to emit a event
 */
export interface EventBus extends Pick<TypedEventEmitter<Events>, 'emit'> {
}

export type EventKeys = keyof Events;

/**
 * use to ensure event will happen
 * Can not inject for now, only use for unittest
 */
export interface EventWaiter {
  await<E extends keyof Events>(event: E): Promise<Arguments<Events[E]>>

  awaitFirst<E1 extends EventKeys, E2 extends EventKeys>(e1: E1, e2: E2): Promise<{ event: E1 | E2, args: Arguments<Events[E1] | Events[E2]> }>
  awaitFirst<E1 extends EventKeys, E2 extends EventKeys, E3 extends EventKeys>(e1: E1, e2: E2, e3: E3): Promise<{ event: E1 | E2 | E3, args: Arguments<Events[E1] | Events[E2] | Events[E3]> }>
  awaitFirst<E1 extends EventKeys, E2 extends EventKeys, E3 extends EventKeys, E4 extends EventKeys>(e1: E1, e2: E2, e3: E3, e4: E4): Promise<{ event: E1 | E2 | E3 | E4, args: Arguments<Events[E1] | Events[E2] | Events[E3] | Events[E4]> }>
}

export interface EventHandler<E extends keyof Events> {
  handle: Events[E];
}
