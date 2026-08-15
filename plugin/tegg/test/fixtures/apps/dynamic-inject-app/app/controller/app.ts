import { Controller } from 'egg';
import { HelloService } from '../../modules/dynamic-inject-module/HelloService';
import { SingletonHelloService } from '../../modules/dynamic-inject-module/SingletonHelloService';

export default class App extends Controller {
  async dynamicInject() {
    const helloService: HelloService = await (this.ctx.module as any).dynamicInjectModule.helloService;
    const msgs = await helloService.hello();
    this.ctx.status = 200;
    this.ctx.body = msgs;
  }

  async singletonDynamicInject() {
    const helloService: SingletonHelloService = await (this.app.module as any).dynamicInjectModule.singletonHelloService;
    const msgs = await helloService.hello();
    this.ctx.status = 200;
    this.ctx.body = msgs;
  }
  async factoryQualifier() {
    const helloService: HelloService = await (this.ctx.module as any).dynamicInjectModule.factoryQualifierService;
    const msgs = await helloService.hello();
    this.ctx.status = 200;
    this.ctx.body = msgs;
  }
}
