import { HTTPMethodEnum } from '@eggjs/tegg-types';
import { Acl } from '../../src/decorator/Acl';
import { HTTPController } from '../../src/decorator/http/HTTPController';
import { HTTPMethod } from '../../src/decorator/http/HTTPMethod';

@Acl('mock1')
@HTTPController()
export class AclController {
  @Acl('mock2')
  @HTTPMethod({
    path: '/foo',
    method: HTTPMethodEnum.GET,
  })
  async foo() {
    console.log('hello,acl');
  }

  @HTTPMethod({
    path: '/bar',
    method: HTTPMethodEnum.GET,
  })
  async bar() {
    console.log('hello,acl');
  }
}
