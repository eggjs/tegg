import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';
import { AppCache } from './AppCache';

@ContextProto()
export class CountService {
  @Inject()
  appCache: AppCache;

  async getCount(): Promise<number> {
    return this.appCache.getCount();
  }
}

@SingletonProto()
export class SingletonCountService {
  @Inject()
  appCache: AppCache;

  async getCount(): Promise<number> {
    return this.appCache.getCount();
  }
}
