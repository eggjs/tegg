'use strict';

module.exports = () => {
  return async function tracelog(ctx, next) {
    ctx.req.headers.trace = 'middleware';
    await next();
  };
};
