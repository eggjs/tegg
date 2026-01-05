'use strict';

const path = require('path');

module.exports = function (appInfo) {
  const config = {
    keys: 'test key',
    logger: {
      level: 'DEBUG',
      consoleLevel: 'NONE',
    },
    httpclient: {
      httpAgent: {
        keepAlive: false,
        timeout: 30000,
      },
    },
    dnsCache: {
      mode: 'lookup',
      lookupInterval: 3000,
      addressRotation: true,
      resolveLocalhost: false,
    },
    customLogger: {
      dnsCacheLogger: {
        file: path.join(appInfo.root, 'logs/dns-cache.log'),
        level: 'DEBUG',
        consoleLevel: 'NONE',
      },
    },
  }
  return config;
};
