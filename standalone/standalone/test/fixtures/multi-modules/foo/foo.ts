import { ContextProto, Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';
import { ModuleConfig } from 'egg';
import { ConfigSourceQualifier } from '../../../../src/ConfigSource';
import { ModuleConfigs } from '../../../../src/ModuleConfigs';

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

  @Inject()
  moduleConfig: ModuleConfig;

  @Inject({
    name: 'moduleConfig',
  })
  @ConfigSourceQualifier('bar')
  barModuleConfig: ModuleConfig;

  async main(): Promise<object> {
    return {
      configs: this.moduleConfigs,
      foo: this.moduleConfig,
      bar: this.barModuleConfig,
    };
  }
}
