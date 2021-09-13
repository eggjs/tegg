import { Controller } from 'egg';

export default class App extends Controller {
  async invokeFoo() {
    const ret = await this.ctx.module.moduleMain.mainService.invokeFoo();
    this.ctx.body = {
      ret,
    };
  }
}
