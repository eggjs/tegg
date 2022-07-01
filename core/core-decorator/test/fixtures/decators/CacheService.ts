import { ContextProto, Inject } from '../../..';
import { ICache } from './ICache';
import { TestService, TestService2 } from './OtherService';

@ContextProto()
export class TestService3 {
  sayHi() {
    console.info('hi');
  }
}

@ContextProto()
export class TestService4 {
  sayHi() {
    console.info('hi');
  }
}


@ContextProto()
export default class CacheService {
  static fileName = __filename;

  @Inject({
    name: 'fooCache',
  })
  cache: ICache;

  @Inject('testService')
  testService: TestService;

  @Inject()
  testService2: TestService2;

  @Inject()
  otherService: TestService3;

  @Inject()
  testService4: any;
}
