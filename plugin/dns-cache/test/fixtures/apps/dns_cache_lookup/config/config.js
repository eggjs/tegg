'use strict';

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
  }
  return config;
};
