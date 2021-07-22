import { ContextProto, Inject } from '@eggjs/core-decorator';
import { AppCache } from './AppCache';

@ContextProto()
export default class CountService {
  @Inject()
  appCache: AppCache;

  async getCount(): Promise<number> {
    return this.appCache.getCount();
  }
}
