import { Inject, SingletonProto, RuntimeConfig } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<RuntimeConfig> {
  @Inject()
  runtimeConfig: RuntimeConfig;

  async main(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
  }

}
