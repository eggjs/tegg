import 'egg';

import type { Foo } from '../modules/module-with-config/foo.ts';

declare module 'egg' {
  export interface EggModule {
    constructorSimple: {
      foo: Foo;
    },
  }
}
