import { Context as EggContext } from 'egg';
import {
  Context,
  HTTPBody,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  HTTPQuery,
  Request,
  Middleware,
  Inject,
  HTTPRequest,
} from '@eggjs/tegg';
import AppService from '../../modules/multi-module-service/AppService';
import App from '../../modules/multi-module-common/model/App';
import { countMw } from '../middleware/count_mw';

@HTTPController({
  path: '/apps',
})
@Middleware(countMw)
export class AppController {
  @Inject()
  appService: AppService;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async get(@Context() ctx: EggContext, @HTTPParam() id: string) {
    const traceId = await ctx.tracer.traceId;
    const app = await this.appService.findApp(id);
    return {
      traceId,
      app,
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '',
  })
  async find(@Context() ctx: EggContext, @HTTPQuery() name: string) {
    const traceId = await ctx.tracer.traceId;
    const app = await this.appService.findApp(name);
    return {
      traceId,
      app,
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '',
  })
  async save(@Context() ctx: EggContext, @HTTPBody() app: App, @Request() request: HTTPRequest) {
    const traceId = await ctx.tracer.traceId;
    await this.appService.save(app);
    return {
      success: true,
      traceId,
      headers: Object.fromEntries(request.headers),
      method: request.method,
      requestBody: await request.text(),
    };
  }
}
