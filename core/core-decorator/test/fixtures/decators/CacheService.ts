import { ContextProto, Inject } from '../../..';
import { ICache } from './ICache';

@ContextProto()
export default class CacheService {
  static fileName = __filename;

  @Inject({
    name: 'fooCache',
    proto: 'ICache',
  })
  cache: ICache;
}
