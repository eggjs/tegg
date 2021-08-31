import { SingletonProto } from '@eggjs/tegg';
import { SingletonHelloType } from '../FooType';
import { SingletonHello } from '../decorator/SingletonHello';
import { AbstractContextHello } from '../AbstractContextHello';

@SingletonProto()
@SingletonHello(SingletonHelloType.FOO)
export class FooSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(singleton:${this.id++})`;
  }
}
