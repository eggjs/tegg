import { ContextProto } from '@eggjs/core-decorator';
import { ContextHello } from '../base/ContextHello';
import { ContextHelloType } from '../base/FooType';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class BarContextHello {
  id = 0;

  helloWrong(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
