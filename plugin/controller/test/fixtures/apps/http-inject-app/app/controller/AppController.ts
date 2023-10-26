import { Context as EggContext } from 'egg';
import {
  Context,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Middleware,
  Request,
  HTTPRequest,
} from '@eggjs/tegg';
import { countMw } from '../middleware/count_mw';

@HTTPController({
  path: '/apps',
})
@Middleware(countMw)
export class AppController {

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/testRequest',
  })
  async testRequest(@Context() ctx: EggContext, @Request() request: HTTPRequest) {
    const traceId = await ctx.tracer.traceId;
    return {
      success: true,
      traceId,
      headers: Object.fromEntries(request.headers),
      method: request.method,
      requestBody: await request.text(),
    };
  }
}
