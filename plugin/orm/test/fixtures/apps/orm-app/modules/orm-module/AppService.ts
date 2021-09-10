import { ContextProto } from '@eggjs/tegg';
import { App } from './model/App';

@ContextProto()
export class AppService {
  // TODO impl inject Bone for context
  App: typeof App = App;

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
