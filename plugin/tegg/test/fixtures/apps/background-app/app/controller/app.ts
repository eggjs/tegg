import { Controller } from 'egg';
import BackgroundService from '../../modules/multi-module-background/BackgroundService';

export default class App extends Controller {
  async background() {
    const backgroundService = await this.ctx.getEggObject(BackgroundService);
    await backgroundService.backgroundAdd();
    this.ctx.status = 200;
    this.ctx.body = 'done';
  }

  async backgroudTimeout() {
    const backgroundService = await this.ctx.getEggObject(BackgroundService);
    await backgroundService.backgroundAdd(6000);
    this.ctx.status = 200;
    this.ctx.body = 'done';
  }
}
