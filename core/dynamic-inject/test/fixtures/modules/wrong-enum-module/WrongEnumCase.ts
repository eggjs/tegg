import { ContextProto } from '@eggjs/core-decorator';
import { ContextHello } from '../base/ContextHello';
import { AbstractContextHello } from '../base/AbstractContextHello';

@ContextProto()
@ContextHello('WRONG_ENUM')
export class BarContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
