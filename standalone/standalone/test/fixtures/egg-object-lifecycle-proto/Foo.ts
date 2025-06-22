import { SingletonProto } from '@eggjs/tegg';
import { MainRunner, Runner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  message: string;

  async main(): Promise<string> {
    return this.message;
  }
}
