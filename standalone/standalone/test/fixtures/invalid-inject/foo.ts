import { Inject, SingletonProto } from '@eggjs/tegg';
import { MainRunner, Runner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<boolean> {
  @Inject()
  doesNotExist?: object;

  async main(): Promise<boolean> {
    return !!this.doesNotExist;
  }
}
