import 'egg';
import type { Foo } from '../../modules/module-with-config/foo.ts';
import type { Bar } from '../../modules/module-with-overwrite-config/bar.ts';

declare module 'egg' {
  export interface EggModule {
    simple: {
      foo: Foo;
    },
    overwrite: {
      bar: Bar;
    },
  }
}
