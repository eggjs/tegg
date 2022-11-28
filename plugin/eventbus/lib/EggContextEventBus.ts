import assert from 'assert';
import { Context } from 'egg';
import { Events, PrototypeUtil, CORK_ID, ContextEventBus } from '@eggjs/tegg';
import { SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContext } from '@eggjs/tegg-runtime';

export class EggContextEventBus implements ContextEventBus {
  private readonly eventBus: SingletonEventBus;
  private readonly context: EggContext;
  private corkId?: string;

  constructor(ctx: Context) {
    this.context = ctx.teggContext;
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = ctx.app.eggContainerFactory.getEggObject(proto, proto.name, this.context);
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
    this.eventBus.uncork(this.corkId);
  }

  emit<E extends keyof Events>(event: E, ...args: any): boolean {
    return this.eventBus.emitWithContext(this.context, event, args);
  }


}
