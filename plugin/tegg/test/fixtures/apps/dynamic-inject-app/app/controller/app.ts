import { Controller } from 'egg';
import { HelloService } from '../../modules/dynamic-inject-module/HelloService';

export default class App extends Controller {
  async dynamicInject() {
    const helloService: HelloService = await (this.ctx.module as any).dynamicInjectModule.helloService;
    const msgs = await helloService.hello();
    this.ctx.status = 200;
    this.ctx.body = msgs;
  }
}
