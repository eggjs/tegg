import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';
import { EventBus, Events, EventWaiter, EventName } from '@eggjs/eventbus-decorator';
import { EggContext } from '@eggjs/tegg-runtime';
import type { EggLogger } from 'egg';
import { EventContextFactory } from './EventContextFactory';
import { EventHandlerFactory } from './EventHandlerFactory';
import { EventEmitter } from 'events';
import awaitEvent from 'await-event';
import awaitFirst from 'await-first';

// from typed-emitter
type Arguments<T> = [ T ] extends [ (...args: infer U) => any ]
  ? U
  : [ T ] extends [ void ] ? [] : [ T ];

@SingletonProto({
  // TODO 需要考虑支持别名
  // SingletonEventBus 同时实现了两个接口
  name: 'eventBus',
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonEventBus implements EventBus, EventWaiter {
  private readonly emitter = new EventEmitter();

  @Inject()
  private readonly eventContextFactory: EventContextFactory;

  @Inject()
  private readonly eventHandlerFactory: EventHandlerFactory;

  @Inject()
  private readonly logger: EggLogger;

  /**
   * only use for ensure event will happen
   */
  once<E extends keyof Events>(event: E, listener: Events[E]): this {
    this.emitter.once(event, listener);
    return this;
  }

  async await<E extends keyof Events>(event: E): Promise<Arguments<Events[E]>> {
    return awaitEvent(this.emitter, event);
  }

  awaitFirst<E extends keyof Events>(...e: Array<E>): Promise<{ event: EventName, args: Arguments<Events[E]> }> {
    return awaitFirst(this.emitter, e);
  }

  emit<E extends keyof Events>(event: E, ...args: Arguments<Events[E]>): boolean {
    const ctx = this.eventContextFactory.createContext();
    const hasListener = this.eventHandlerFactory.hasListeners(event);
    this.doEmit(ctx, event, args);
    return hasListener;
  }

  emitWithContext<E extends keyof Events>(parentContext: EggContext, event: E, args: Arguments<Events[E]>): boolean {
    const ctx = this.eventContextFactory.createContext(parentContext);
    const hasListener = this.eventHandlerFactory.hasListeners(event);
    this.doEmit(ctx, event, args);
    return hasListener;
  }

  doOnceEmit<E extends keyof Events>(event: E, args: Arguments<Events[E]>) {
    try {
      this.emitter.emit(event, ...args);
    } catch (e) {
      e.message = `[EventBus] process once event ${event} failed: ${e.message}`;
      this.logger.error(e);
    }
  }

  async doEmit<E extends keyof Events>(ctx: EggContext, event: E, args: Arguments<Events[E]>) {
    const lifecycle = {};
    if (ctx.init) {
      await ctx.init(lifecycle);
    }
    try {
      const handlers = await this.eventHandlerFactory.getHandlers(event, ctx);
      await Promise.all(handlers.map(handler => {
        return Reflect.apply(handler.handle, handler, args);
      }));
    } catch (e) {
      e.message = `[EventBus] process event ${event} failed: ${e.message}`;
      this.logger.error(e);
    } finally {
      if (ctx.destroy) {
        ctx.destroy(lifecycle).catch(e => {
          e.message = '[tegg/SingletonEventBus] destroy tegg ctx failed:' + e.message;
          this.logger.error(e);
        });
      }
    }
    this.doOnceEmit(event, args);
  }
}
