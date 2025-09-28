import 'egg';

import { Foo } from '../modules/module-with-config/foo.js';

declare module 'egg' {
  export interface EggModule {
    constructorSimple: {
      foo: Foo;
    },
  }
}
