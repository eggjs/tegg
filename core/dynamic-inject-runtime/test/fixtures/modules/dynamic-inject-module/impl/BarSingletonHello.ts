import { SingletonProto } from '@eggjs/core-decorator';
import { SingletonHelloType } from '../FooType';
import { SingletonHello } from '../decorator/SingletonHello';
import { AbstractContextHello } from '../AbstractContextHello';

@SingletonProto()
@SingletonHello(SingletonHelloType.BAR)
export class BarSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(singleton:${this.id++})`;
  }
}
