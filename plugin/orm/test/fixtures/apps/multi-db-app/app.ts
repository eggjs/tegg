import { Application } from 'egg';
// @ts-expect-error: the library definition is wrong
import { Logger } from 'leoric';

export default class OrmAppHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    await this.app.leoricRegister.ready();
    const app = this.app;
    for (const realm of this.app.leoricRegister.realmMap.values()) {
      realm.driver.logger = new Logger({
        logQuery(sql, _, options) {
          const path = options.Model?.ctx?.path;
          app.logger.info('sql: %s path: %s', sql, path);
        },
      });
    }
  }
}
