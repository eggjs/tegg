import 'egg';
import { Foo } from '../modules/module-with-config/foo.js';

declare module '@eggjs/core' {
  export interface EggModule {
    constructorSimple: {
      foo: Foo;
    },
  }
}
