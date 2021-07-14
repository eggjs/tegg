import PersistenceService from './PersistenceService';
import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';
import App from '../multi-module-common/model/App';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class GlobalAppRepo {
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
