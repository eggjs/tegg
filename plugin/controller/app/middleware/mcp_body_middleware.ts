import { EggContext, Next } from '@eggjs/tegg';
import pathToRegexp from 'path-to-regexp';

export default () => {
  return async function mcpBodyMiddleware(ctx: EggContext, next: Next) {
    const arr = [ '/mcp/init', '/mcp/message', '/mcp/stream' ];
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
