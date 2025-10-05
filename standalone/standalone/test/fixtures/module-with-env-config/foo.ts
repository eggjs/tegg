import type { ModuleConfigs } from '@eggjs/tegg';
import { ContextProto, Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

@SingletonProto()
export class Hello {
  hello() {
    return 'hello!';
  }
}

@ContextProto()
export class HelloContext {
  hello() {
    return 'hello from ctx';
  }
}

@ContextProto()
@Runner()
export class Foo implements MainRunner<object> {
  @Inject()
  moduleConfigs: ModuleConfigs;

  async main(): Promise<object> {
    return this.moduleConfigs.get('simple')!;
  }
}
