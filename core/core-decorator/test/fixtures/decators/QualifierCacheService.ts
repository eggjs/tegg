import { ContextProto, InitTypeQualifier, Inject, ModuleQualifier, ObjectInitType } from '../../..';
import { ICache } from './ICache';

@ContextProto()
export default class CacheService {
  @Inject({
    name: 'fooCache',
    proto: 'ICache',
  })
  @InitTypeQualifier(ObjectInitType.SINGLETON)
  @ModuleQualifier('foo')
  cache: ICache;
}
