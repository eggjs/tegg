'use strict';

module.exports = function () {
  const config = {
    keys: 'test key',
    logger: {
      level: 'DEBUG',
      consoleLevel: 'DEBUG',
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
    }
  }
  return config;
};
