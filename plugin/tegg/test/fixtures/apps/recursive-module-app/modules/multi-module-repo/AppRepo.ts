import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import AppService from '../multi-module-service/AppService';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {
  @Inject()
  appService: AppService;

  public async findApp(): Promise<Record<string, any>> {
    return this.appService.findApp();
  }
}
