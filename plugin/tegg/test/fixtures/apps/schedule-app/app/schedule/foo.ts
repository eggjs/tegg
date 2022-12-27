import { Subscription } from 'egg';

export default class Foo extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'all',
    };
  }

  async subscribe() {
    await this.ctx.beginModuleScope(async () => {
      await this.ctx.app.module.multiModuleService.appService.findApp();
    });
  }
}
