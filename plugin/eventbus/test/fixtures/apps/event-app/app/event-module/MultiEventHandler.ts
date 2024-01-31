import { Event, EventContext, IEventContext } from '@eggjs/tegg';
@Event('helloEgg')
@Event('hiEgg')
export class MultiEventHandler {
  handle(@EventContext()ctx: IEventContext, msg: string) {
    console.log('How are you', msg, ctx);
  }
}
