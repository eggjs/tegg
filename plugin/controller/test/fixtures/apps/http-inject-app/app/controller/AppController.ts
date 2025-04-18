import { Context as EggContext } from 'egg';
import { setTimeout } from 'node:timers/promises';
import {
  Context,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Middleware,
  Request,
  HTTPRequest,
  Cookies,
  HTTPCookies,
  Inject, BackgroundTaskHelper } from '@eggjs/tegg';
import { countMw } from '../middleware/count_mw';
import { Tracer } from '@eggjs/module-test-util';
import { Readable } from 'node:stream';

@HTTPController({
  path: '/apps',
})
@Middleware(countMw)
export class AppController {
  @Inject()
  readonly tracer: Tracer;

  @Inject()
  readonly backgroundTaskHelper: BackgroundTaskHelper;

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/testRequest',
  })


  async testRequest(@Context() ctx: EggContext, @Request() request: HTTPRequest, @Cookies() cookies: HTTPCookies) {
    const traceId = await ctx.tracer.traceId;
    return {
      success: true,
      traceId,
      headers: Object.fromEntries(request.headers),
      method: request.method,
      requestBody: await request.text(),
      cookies: cookies.get('test', { signed: false }),
    };
  }


  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/stream' })
  async streamResponse(@Context() ctx: EggContext) {
    const self = this;
    async function* generate(count = 5, duration = 500) {
      yield '<html><head><title>hello stream</title></head><body>';
      for (let i = 0; i < count; i++) {
        console.log('generate', i);
        yield `<h2>流式内容${i + 1}，${Date()}</h2>`;
        await setTimeout(duration);
      }
      yield self.backgroundTaskHelper.toString();
      yield '</body></html>';

    }

    ctx.type = 'html';
    ctx.set('X-Accel-Buffering', 'no');
    return Readable.from(generate());
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/error_stream' })
  async errorStreamResponse(@Context() ctx: EggContext) {
    const self = this;
    async function* generate(count = 5, duration = 500) {
      yield '<html><head><title>hello stream</title></head><body>';
      for (let i = 0; i < count; i++) {
        console.log('generate', i);
        if (i > 2) {
          throw new Error('test');
        }
        yield `<h2>流式内容${i + 1}，${Date()}</h2>`;
        await setTimeout(duration);
      }
      yield self.backgroundTaskHelper.toString();
      yield '</body></html>';

    }

    ctx.type = 'html';
    ctx.set('X-Accel-Buffering', 'no');
    return Readable.from(generate());
  }
}
