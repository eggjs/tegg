import { Inject, SingletonProto } from '@eggjs/tegg';
import { RuntimeConfig } from '@eggjs/tegg-common-util';
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
