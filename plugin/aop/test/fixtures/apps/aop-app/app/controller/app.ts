import { Controller } from 'egg';
import { Hello } from '../../modules/aop-module/Hello';

export default class App extends Controller {
  async aop() {
    const hello: Hello = await (this.ctx.module as any).aopModule.hello;
    const msg = await hello.hello('foo');
    this.ctx.status = 200;
    this.ctx.body = { msg };
  }
}
