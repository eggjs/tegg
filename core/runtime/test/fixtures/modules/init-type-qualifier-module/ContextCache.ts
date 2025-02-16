import { ContextProto } from '@eggjs/core-decorator';
import { ICache, CacheValue } from './Cache.js';

@ContextProto({
  name: 'cache',
})
export default class ContextCache implements ICache {
  private map = new Map();

  get(key: string): CacheValue {
    const val = this.map.get(key);
    return {
      val,
      from: 'context',
    };
  }

  set(key: string, val: string) {
    this.map.set(key, val);
  }
}
