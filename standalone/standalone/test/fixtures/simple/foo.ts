import { Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';

@SingletonProto()
export class Hello {
  hello() {
    return 'hello';
  }
}

@SingletonProto()
@Runner()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: Hello;

  async main(): Promise<string> {
    return this.hello.hello();
  }
}
