import { ContextProto, Inject } from '../../..';
import { ICache } from './ICache';

@ContextProto({ name: 'abcdefg' })
export class TestService {
  sayHi() {
    console.info('hi');
  }
}

@ContextProto()
export class TestService2 {
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

  @Inject('testService2')
  testService2: TestService2;

  @Inject(TestService)
  testService: TestService;
}
