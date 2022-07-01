import { ContextProto, Inject } from '../../..';
import { ICache } from './ICache';

@ContextProto()
export class TestService {
  sayHi() {
    console.info('hi');
  }
}

@ContextProto()
export default class CacheService {
  static fileName = __filename;

  @Inject({
    name: 'fooCache',
    proto: 'ICache',
  } as any)
  cache: ICache;

  @Inject('testService')
  testService: TestService;
}
