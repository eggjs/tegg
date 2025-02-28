import { Hello, SingletonHello } from '../../modules/aop-module/Hello.js';

declare module '@eggjs/core' {
  export interface EggModule {
    aopModule: {
      hello: Hello;
      singletonHello: SingletonHello;
    }
  }
}
