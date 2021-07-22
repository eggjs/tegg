import { Context } from 'egg';
import { Next } from '@eggjs/tegg';

export function logMwFactory(log: string) {
  return async function logMw(ctx: Context, next: Next) {
    await next();
    ctx.body.log = log;
  };
}
