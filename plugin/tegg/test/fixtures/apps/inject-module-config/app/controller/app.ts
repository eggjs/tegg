import { Controller } from 'egg';

export default class App extends Controller {
  async baseDir() {
    const configs = await this.ctx.module.simple.foo.getConfig();
    this.ctx.body = configs;
  }

  async overwriteConfig() {
    const configs = await this.ctx.module.overwrite.bar.getConfig();
    this.ctx.body = configs;
  }
}
