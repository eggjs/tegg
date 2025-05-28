import { ContextProto } from '@eggjs/core-decorator';

@ContextProto()
export class Base {
  id = 233;

  async hello(name: string) {
    return `hello base ${name}`;
  }
}
