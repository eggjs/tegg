import { ICache, CacheValue } from './Cache';
import { SingletonProto } from '@eggjs/core-decorator';

@SingletonProto({
  name: 'cache',
})
export default class SingletonCache implements ICache {
  private map = new Map();

  get(key: string): CacheValue {
    const val = this.map.get(key);
    return {
      val,
      from: 'singleton',
    };
  }

  set(key: string, val: string) {
    this.map.set(key, val);
  }
}
