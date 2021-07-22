import { Controller } from 'egg';

export default class AppController2 extends Controller {
  async foo() {
    const traceId = await this.ctx.tracer.traceId;
    const id = this.ctx.params.id;
    this.ctx.body = {
      traceId,
      app: 'mock-app:' + id,
    };
  }
}
