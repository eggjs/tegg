'use strict';

module.exports = () => {
  return async function tracelog(ctx, next) {
    ctx.req.headers.trace = 'middleware';
    ctx.req.rawHeaders.push('trace');
    ctx.req.rawHeaders.push('middleware');
    await next();
  };
};
