import { EggPrototypeLifecycleProto } from '@eggjs/tegg';
import { LifecycleHook, EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-types';
import { Foo } from './Foo';

@EggPrototypeLifecycleProto()
export class FooEggPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(_: EggPrototypeLifecycleContext, proto: EggPrototype): Promise<void> {
    if (proto.name !== 'FooRunner') {
      return;
    }
    Foo.message = 'class name is ' + proto.className;
  }
}
