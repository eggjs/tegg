import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import type BarService from './BarService.js';

@SingletonProto({
  accessLevel: AccessLevel.PRIVATE,
})
export default class FooService {

  @Inject()
  barService: BarService;

  public moduleAFooServiceMethod() {
    return 'moduleA-FooService-Method';
  }

  public moduleMainFooServiceInvokeBar() {
    return this.barService.moduleABarServiceMethod();
  }
}
