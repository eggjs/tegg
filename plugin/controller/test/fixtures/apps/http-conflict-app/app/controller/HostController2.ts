import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Host,
} from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
@Host('foo.eggjs.com')
export class AppController2 {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async get() {
    return 'hello';
  }
}
