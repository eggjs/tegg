import { ContextProto } from '@eggjs/core-decorator';
import { ContextHello } from '../decorator/ContextHello';
import { ContextHelloType } from '../FooType';
import { AbstractContextHello } from '../AbstractContextHello';

@ContextProto()
@ContextHello(ContextHelloType.BAR)
export class BarContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
