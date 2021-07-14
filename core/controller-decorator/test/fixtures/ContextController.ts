import { Context } from '../../src/decorator/Context';

export class ContextController {
  async hello(@Context() ctx: object) {
    console.log('ctx:', ctx);
  }
}
