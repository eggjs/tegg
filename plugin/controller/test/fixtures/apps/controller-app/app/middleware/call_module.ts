import { Context } from 'egg';
import { Next } from '@eggjs/tegg';

export async function callModuleCtx(ctx: Context, next: Next) {
  await (ctx.module as any).multiModuleService.appService.findApp('foo');
  await next();
}
