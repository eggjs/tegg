'use strict';

module.exports = (_options, app) => {
  return async function tracelog(ctx, next) {
    ctx.req.headers.trace = 'middleware';
    ctx.req.rawHeaders.push('trace');
    ctx.req.rawHeaders.push('middleware');
    try {
      await next();
    } finally {
      if (ctx.path === '/mcp/sse' || ctx.path === '/mcp/test/sse') {
        app.mcpSseSyntheticMiddlewareEndCount = (app.mcpSseSyntheticMiddlewareEndCount || 0) + 1;
      }
    }
  };
};
