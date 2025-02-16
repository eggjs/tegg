import { ObjectInitType } from '@eggjs/tegg-types';
import { ContextProto, InitTypeQualifier, Inject } from '@eggjs/core-decorator';
import { ICache, CacheValue } from './Cache.js';

@ContextProto()
export default class CacheService {
  @InitTypeQualifier(ObjectInitType.SINGLETON)
  @Inject({ name: 'cache' })
  singletonCache: ICache;

  @InitTypeQualifier(ObjectInitType.CONTEXT)
  @Inject({ name: 'cache' })
  contextCache: ICache;

  setSingletonCache(key: string, val: string) {
    this.singletonCache.set(key, val);
  }

  getSingletonCache(key: string): CacheValue {
    return this.singletonCache.get(key);
  }

  setContextCache(key: string, val: string) {
    this.contextCache.set(key, val);
  }

  getContextCache(key: string): CacheValue {
    return this.contextCache.get(key);
  }
}
