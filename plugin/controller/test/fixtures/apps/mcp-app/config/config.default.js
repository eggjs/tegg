'use strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { randomUUID } = require('node:crypto');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

module.exports = function(appInfo) {
  const config = {
    keys: 'test key',
    mcp: {
      ssePingEnabled: true,
      streamPingEnabled: true,
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
        },
      },
    },
    customLogger: {
      mcpMiddewareStartLogger: {
        file: path.join(appInfo.root, 'logs', 'tracelog', 'mcpMiddlewareStart.log'),
      },
      mcpMiddewareEndLogger: {
        file: path.join(appInfo.root, 'logs', 'tracelog', 'mcpMiddlewareEnd.log'),
      },
      mcpMiddewareErrorLogger: {
        file: path.join(appInfo.root, 'logs', 'tracelog', 'mcpMiddlewareError.log'),
      },
    },
  };
  return config;
};
