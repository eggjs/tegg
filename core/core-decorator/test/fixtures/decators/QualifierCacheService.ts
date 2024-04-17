import { ObjectInitType } from '@eggjs/tegg-types';
import { ContextProto, InitTypeQualifier, Inject, ModuleQualifier } from '../../..';
import { ICache } from './ICache';

@ContextProto()
export default class CacheService {
  @Inject({
    name: 'fooCache',
  })
  @InitTypeQualifier(ObjectInitType.SINGLETON)
  @ModuleQualifier('foo')
  cache: ICache;
}
