import 'egg';
import { Foo } from '../../modules/module-with-config/foo';
import { Bar } from '../../modules/module-with-overwrite-config/bar';

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
