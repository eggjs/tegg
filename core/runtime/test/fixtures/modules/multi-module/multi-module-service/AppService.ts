import { ContextProto, Inject } from '@eggjs/core-decorator';
import AppRepo from '../multi-module-repo/AppRepo';
import App from '../multi-module-common/model/App';

@ContextProto()
export default class AppService {
  @Inject()
  appRepo: AppRepo;

  findApp(name: string): Promise<App | null> {
    return this.appRepo.findApp(name);
  }

  save(app: App) {
    return this.appRepo.insertApp(app);
  }
}
