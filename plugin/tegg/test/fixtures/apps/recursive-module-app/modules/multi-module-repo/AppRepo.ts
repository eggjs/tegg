import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';
import AppService from '../multi-module-service/AppService';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {
  @Inject()
  appService: AppService;

  public async findApp(): Promise<Record<string, any>> {
    return this.appService.findApp();
  }
}
