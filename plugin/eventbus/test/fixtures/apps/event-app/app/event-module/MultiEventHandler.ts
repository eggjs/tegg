import { Event } from '@eggjs/tegg';
@Event('helloEgg')
@Event('hiEgg')
export class MultiEventHandler {
  handle(msg: string) {
    console.log('How are you', msg);
  }
}
