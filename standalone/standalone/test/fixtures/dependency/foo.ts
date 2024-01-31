import { ContextProto, Inject } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';
import { Hello } from 'dependency-2/foo';
import { ConfigSourceQualifier } from '../../../../../core/core-decorator/src/decorator/ConfigSource';

@ContextProto()
@Runner()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: Hello;

  @Inject()
  @ConfigSourceQualifier('dependency2')
  moduleConfig: any;

  async main(): Promise<string> {
    return this.hello.hello() + JSON.stringify(this.moduleConfig);
  }
}
