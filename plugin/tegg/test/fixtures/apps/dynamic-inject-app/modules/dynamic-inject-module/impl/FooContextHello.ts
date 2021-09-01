import { ContextProto } from '@eggjs/tegg';
import { ContextHello } from '../decorator/ContextHello';
import { ContextHelloType } from '../FooType';
import { AbstractContextHello } from '../AbstractContextHello';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class FooContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(context:${this.id++})`;
  }
}
