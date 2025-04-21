import { HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';
import { TimerUtil } from '@eggjs/tegg-common-util';

@HTTPController({
  timeout: 1000,
})
export class TimeoutController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/timeout-1', timeout: 500 })
  async timeout1() {
    await TimerUtil.sleep(600);
    return 'success';
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/timeout-2', timeout: 500 })
  async timeout2() {
    await TimerUtil.sleep(300);
    return 'success';
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/timeout-3' })
  async timeout3() {
    await TimerUtil.sleep(1200);
    return 'success';
  }
}
