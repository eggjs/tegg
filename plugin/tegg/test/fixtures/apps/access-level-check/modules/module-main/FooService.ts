import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';
import BarService from './BarService';

@ContextProto({
  accessLevel: AccessLevel.PRIVATE,
})
export default class FooService {

  @Inject()
  barService: BarService;

  public moduleMainFooServiceMethod() {
    return 'moduleMain-FooService-Method';
  }

  public moduleMainFooServiceInvokeBar() {
    return this.barService.moduleMainBarServiceMethod();
  }
}
