import { Context } from 'egg';
import { EventBus, Events, PrototypeUtil } from '@eggjs/tegg';
import { SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { EggContext } from '@eggjs/tegg-runtime';

export class EggContextEventBus implements EventBus {
  private readonly eventBus: SingletonEventBus;
  private readonly context: EggContext;

  constructor(ctx: Context) {
    this.context = ctx.teggContext;
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = ctx.app.eggContainerFactory.getEggObject(proto, proto.name, this.context);
    this.eventBus = eggObject.obj as SingletonEventBus;
  }

  emit<E extends keyof Events>(event: E, ...args: any): boolean {
    return this.eventBus.emitWithContext(this.context, event, args);
  }


}
