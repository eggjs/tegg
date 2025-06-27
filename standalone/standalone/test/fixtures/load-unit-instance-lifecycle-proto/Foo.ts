import { SingletonProto } from '@eggjs/tegg';
import { MainRunner, Runner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<number> {
  count: number;

  async main(): Promise<number> {
    return this.count;
  }
}
