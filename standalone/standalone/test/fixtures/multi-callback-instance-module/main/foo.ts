import { Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, MainRunner } from '@eggjs/tegg/standalone';
import { DynamicLogger, LogPath } from '../logger/DynamicLogger';
import { Biz } from '../biz/biz';

@SingletonProto()
@Runner()
export class Foo implements MainRunner<void> {
  @Inject({
    name: 'dynamicLogger',
  })
  @LogPath('foo')
  fooDynamicLogger: DynamicLogger;

  @Inject({
    name: 'dynamicLogger',
  })
  @LogPath('bar')
  barDynamicLogger: DynamicLogger;

  @Inject()
  biz: Biz;

  async main(): Promise<void> {
    await this.fooDynamicLogger.info('hello, foo');
    await this.barDynamicLogger.info('hello, bar');
    await this.biz.doSomething();
  }
}
