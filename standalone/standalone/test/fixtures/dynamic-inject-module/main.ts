import { ContextProto, Inject } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';
import { HelloService } from './HelloService';

@Runner()
@ContextProto()
export class Foo implements MainRunner<string[]> {
  @Inject()
  helloService: HelloService;

  async main(): Promise<string[]> {
    return await this.helloService.hello();
  }
}
