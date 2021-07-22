import { Context } from 'egg';
import { Next } from '@eggjs/tegg';

let index = 0;

export async function countMw(ctx: Context, next: Next) {
  await next();
  if (ctx.body) ctx.body.count = index++;
}
