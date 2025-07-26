'use strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { randomUUID } = require('node:crypto');

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        enable: false,
      },
    },
    mcp: {
      sessionIdGenerator: ctx => {
        return ctx.request.headers['custom-session-id'] || randomUUID();
      },
      middleware: [
        'tracelog',
      ],
      multipleServer: {
        test: {
          sessionIdGenerator: ctx => {
            return ctx.request.headers['custom-session-id'] || randomUUID();
          },
        }
      }
    },
  };
  return config;
};
