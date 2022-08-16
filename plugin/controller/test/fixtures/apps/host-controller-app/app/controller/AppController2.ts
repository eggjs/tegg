import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Host,
} from '@eggjs/tegg';

@Host('bar.eggjs.com')
@HTTPController({
  path: '/apps',
})
export class AppController2 {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async get() {
    return 'bar';
  }
}
