import { ContextProto } from '@eggjs/core-decorator';
import { Base } from '../c/Base';

@ContextProto()
export class A extends Base {
  id = 233;

  async hello(name: string) {
    return `hello A ${name}`;
  }
}
