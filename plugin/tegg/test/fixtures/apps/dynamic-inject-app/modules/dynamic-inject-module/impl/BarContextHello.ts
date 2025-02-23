import { ContextProto } from '@eggjs/tegg';
import { ContextHello } from '../decorator/ContextHello.js';
import { ContextHelloType } from '../FooType.js';
import { AbstractContextHello } from '../AbstractContextHello.js';

@ContextProto()
@ContextHello(ContextHelloType.BAR)
export class BarContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
