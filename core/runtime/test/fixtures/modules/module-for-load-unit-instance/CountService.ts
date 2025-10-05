import { ContextProto, Inject } from '@eggjs/core-decorator';
import type AppCache from './AppCache.js';
import type TempObj from './TempObj.js';

@ContextProto()
export default class CountService {
  @Inject()
  appCache: AppCache;

  @Inject()
  tempObj: TempObj;

  async getCount(): Promise<number> {
    return this.appCache.getCount();
  }

  async getTempCount(): Promise<number> {
    return this.tempObj.getCount();
  }
}
