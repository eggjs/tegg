import PersistenceService from './PersistenceService';
import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import App from '../multi-module-common/model/App';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {
  @Inject()
  persistenceService: PersistenceService;

  public async findApp(name): Promise<App | null> {
    const raw = this.persistenceService.get(name);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  }

  public async insertApp(app: App): Promise<void> {
    this.persistenceService.set(app.name, JSON.stringify(app));
  }
}
