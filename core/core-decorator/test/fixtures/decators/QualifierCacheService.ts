import { ContextProto, InitTypeQualifier, Inject, ModuleQualifier, ObjectInitType } from '../../..';
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
