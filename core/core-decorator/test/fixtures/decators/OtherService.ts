import { ContextProto } from '../../..';

@ContextProto()
export class TestService {
  sayHi() {
    console.info('hi');
  }
}

@ContextProto({ name: 'abcabc' })
export class TestService2 {
  sayHi() {
    console.info('hi');
  }
}
