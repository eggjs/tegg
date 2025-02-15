import { ContextProto } from '../../../src/index.js';
import { Inject, InjectOptional } from '../../../src/index.js';
import { ICache } from './ICache.js';
import { TestService, TestService2 } from './OtherService.js';

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

  @Inject({ optional: true })
  optionalService1?: any;

  @InjectOptional()
  optionalService2?: any;
}
