import assert from 'assert';
import { Context } from 'egg';
import { Events, PrototypeUtil, CORK_ID, ContextEventBus } from '@eggjs/tegg';
import { SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { ContextHandler, EggContext } from '@eggjs/tegg-runtime';
import type { Arguments } from '@eggjs/tegg';

export class EggContextEventBus implements ContextEventBus {
  private readonly eventBus: SingletonEventBus;
  private readonly context: EggContext;
  private corkId?: string;

  constructor(ctx: Context) {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = ctx.app.eggContainerFactory.getEggObject(proto, proto.name);
    this.context = ContextHandler.getContext()!;
    this.eventBus = eggObject.obj as SingletonEventBus;
  }

  cork() {
    if (!this.corkId) {
      this.corkId = this.eventBus.generateCorkId();
      this.context.set(CORK_ID, this.corkId);
    }
    this.eventBus.cork(this.corkId);
  }

  uncork() {
    assert(this.corkId, 'eventbus uncork without cork');
    if (this.eventBus.uncork(this.corkId)) {
      this.context.set(CORK_ID, null);
      this.corkId = undefined;
    }
  }

  emit<E extends keyof Events>(event: E, ...args: Arguments<Events[E]>): boolean {
    return this.eventBus.emitWithContext(this.context, event, args);
  }


}
