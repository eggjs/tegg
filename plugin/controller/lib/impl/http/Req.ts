import type{ Context } from 'egg';
import { HTTPRequest as BaseHTTPRequest } from '@eggjs/tegg';
export class HTTPRequest extends BaseHTTPRequest {
  constructor(ctx:Context) {
    const request = ctx.request;
    super(request.url, {
      method: request.method,
      headers: request.headers as Record<string, string | string[]>,
      body: request.body,
    });
  }
}
