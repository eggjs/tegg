import 'egg';
import { Foo } from '../../modules/module-with-config/foo';

declare module 'egg' {
  export interface EggModule {
    simple: {
      foo: Foo;
    }
  }
}
