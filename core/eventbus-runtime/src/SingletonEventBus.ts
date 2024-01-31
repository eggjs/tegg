import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';
import { EventBus, Events, EventWaiter, EventName, CORK_ID } from '@eggjs/eventbus-decorator';
import type { Arguments } from '@eggjs/eventbus-decorator';
import { ContextHandler, EggContext } from '@eggjs/tegg-runtime';
import type { EggLogger } from 'egg';
import { EventContextFactory } from './EventContextFactory';
import { EventHandlerFactory } from './EventHandlerFactory';
import { EventEmitter } from 'events';
import awaitEvent from 'await-event';
import awaitFirst from 'await-first';

export interface Event {
  name: EventName;
  args: Array<any>;
  context?: EggContext;
}

export interface CorkEvents {
  times: number;
  events: Array<Event>;
}

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

  @Inject({
    name: 'logger',
  })
  private readonly logger: EggLogger;

  private corkIdSequence = 0;

  private readonly corkedEvents = new Map<string /* corkId */, CorkEvents>();

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

  generateCorkId(): string {
    return String(++this.corkIdSequence);
  }

  cork(corkId: string) {
    let corkEvents = this.corkedEvents.get(corkId);
    if (!corkEvents) {
      corkEvents = {
        times: 0,
        events: [],
      } as unknown as CorkEvents;
      this.corkedEvents.set(corkId, corkEvents);
    }
    corkEvents!.times++;
  }

  uncork(corkId: string) {
    const corkEvents = this.corkedEvents.get(corkId);
    if (!corkEvents) {
      throw new Error(`eventbus corkId ${corkId} not found`);
    }
    if (--corkEvents.times !== 0) {
      return false;
    }
    this.corkedEvents.delete(corkId);
    for (const event of corkEvents.events) {
      if (event.context) {
        this.doEmitWithContext(event.context, event.name, event.args);
      }
    }
    return true;
  }

  queueEvent(corkId: string, event: Event) {
    const corkdEvents = this.corkedEvents.get(corkId);
    if (!corkdEvents) {
      throw new Error(`eventbus corkId ${corkId} not found`);
    }
    corkdEvents.events.push(event);
  }

  emitWithContext<E extends keyof Events>(parentContext: EggContext, event: E, args: Arguments<Events[E]>): boolean {
    const corkId = parentContext.get(CORK_ID);
    const hasListener = this.eventHandlerFactory.hasListeners(event);
    if (corkId) {
      this.queueEvent(corkId, { name: event, args, context: parentContext });
      return hasListener;
    }
    return this.doEmitWithContext(parentContext, event, args);
  }

  private doEmitWithContext(parentContext: EggContext, event: EventName, args: Array<any>): boolean {
    const hasListener = this.eventHandlerFactory.hasListeners(event);
    const ctx = this.eventContextFactory.createContext(parentContext);
    this.doEmit(ctx, event, args);
    return hasListener;
  }

  private doOnceEmit(event: EventName, args: Array<any>) {
    try {
      this.emitter.emit(event, ...args);
    } catch (e) {
      e.message = `[EventBus] process once event ${String(event)} failed: ${e.message}`;
      this.logger.error(e);
    }
  }

  private async doEmit(ctx: EggContext, event: EventName, args: Array<any>) {
    await ContextHandler.run(ctx, async () => {
      const lifecycle = {};
      if (ctx.init) {
        await ctx.init(lifecycle);
      }
      try {
        const handlerProtos = this.eventHandlerFactory.getHandlerProtos(event);
        await Promise.all(handlerProtos.map(async proto => {
          try {
            await this.eventHandlerFactory.handle(event, proto, args);
          } catch (e) {
            // should wait all handlers done then destroy ctx
            e.message = `[EventBus] process event ${String(event)} for handler ${String(proto.name)} failed: ${e.message}`;
            this.logger.error(e);
          }
        }));
      } catch (e) {
        e.message = `[EventBus] process event ${String(event)} failed: ${e.message}`;
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
    });
  }
}
