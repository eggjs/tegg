import { EggContext, Next } from '@eggjs/tegg';
import pathToRegexp from 'path-to-regexp';

export default () => {
  return async function mcpBodyMiddleware(ctx: EggContext, next: Next) {
    const arr = [ ctx.app.config.mcp.sseInitPath, ctx.app.config.mcp.sseMessagePath, ctx.app.config.mcp.streamPath, ctx.app.config.mcp.statelessStreamPath ];
    for (const name of Object.keys(ctx.app.config.mcp.multipleServer || {})) {
      arr.push(ctx.app.config.mcp.multipleServer![name].sseInitPath);
      arr.push(ctx.app.config.mcp.multipleServer![name].sseMessagePath);
      arr.push(ctx.app.config.mcp.multipleServer![name].streamPath);
      arr.push(ctx.app.config.mcp.multipleServer![name].statelessStreamPath);
    }
    const res = arr.some(igPath => {
      const match = pathToRegexp(igPath, [], {
        end: false,
      });
      return match.test(ctx.path);
    });
    if (res) {
      ctx.disableBodyParser = true;
    }
    await next();
  };
};
