import { ContextProto, Inject } from '@eggjs/tegg';
import { App } from './model/App';

@ContextProto()
export class AppService {
  @Inject()
  App: typeof App;

  async createApp(data: {
    name: string;
    desc: string;
  }): Promise<App> {
    const bone = await this.App.create(data as any);
    return bone as App;
  }

  async findApp(name: string): Promise<App | null> {
    const app = await this.App.findOne({ name });
    return app as App;
  }
}
