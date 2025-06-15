import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery } from '@eggjs/tegg';

@HTTPController()
export class Controller {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/echo' })
  async echo(@HTTPQuery() name: string) {
    return {
      success: true,
      message: 'hello ' + name,
    };
  }
}
