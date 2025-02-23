import 'egg';
import { HelloService } from '../../modules/dynamic-inject-module/HelloService.js';
import { SingletonHelloService } from '../../modules/dynamic-inject-module/SingletonHelloService.js';

declare module '@eggjs/core' {
  export interface EggModule {
    dynamicInjectModule: {
      helloService: HelloService;
      singletonHelloService: SingletonHelloService;
    }
  }
}
