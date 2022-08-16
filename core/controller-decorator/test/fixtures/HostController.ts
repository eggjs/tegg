import { Host } from '../../src/decorator/http/Host';

@Host('foo.eggjs.com')
export class HostController {
  async hello(): Promise<void> {
    return;
  }

  @Host('bar.eggjs.com')
  async bar(): Promise<void> {
    return;
  }
}
