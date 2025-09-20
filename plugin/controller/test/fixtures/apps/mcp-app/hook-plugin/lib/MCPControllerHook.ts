import type { Application, Context } from 'egg';
import { MCPControllerHook } from '@eggjs/tegg-controller-plugin/lib/impl/mcp/MCPControllerRegister';

export const GetAlipayTeggHook = (app: Application) => {
  const setUser = (ctx: Context) => {
    ctx.set({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'transfer-encoding': 'chunked',
    });
    try {
      const auth = ctx.get('authorization');
      const atitString = Buffer.from(
        auth.substring('Bearer '.length),
        'base64',
      ).toString('utf8');
      ctx.user = atitString;
    } catch (e) {
      app.logger.warn('get user failed: ', e);
    }
  };
  const AlipayTeggControllerHook: MCPControllerHook = {
    async preHandle(ctx) {
      setUser(ctx);
    },
    async preHandleInitHandle(ctx) {
      setUser(ctx);
    },
    async preSSEInitHandle(ctx) {
      setUser(ctx);
    },
    async preProxy(ctx) {
      setUser(ctx);
    },
    async middlewareStart(ctx) {
      ctx.mcpStartTime = Date.now();
      ctx.getLogger('mcpMiddewareStartLogger').info('mcp middleware start');
    },
    async middlewareEnd(ctx) {
      ctx.getLogger('mcpMiddewareEndLogger').info('mcp middleware end, time: ', Date.now() - ctx.mcpStartTime);
    },
  };

  return AlipayTeggControllerHook;
};
