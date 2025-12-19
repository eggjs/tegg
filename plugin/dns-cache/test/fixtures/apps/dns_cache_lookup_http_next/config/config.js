'use strict';

module.exports = function () {
  const config = {
    keys: 'test key',
    httpclient: {
      useHttpClientNext: true,
      request: {
        reset: true,
        timeout: 3000,
      },
      httpAgent: {
        keepAlive: false,
        timeout: 30000,
      },
    },
    dnsCache: {
      mode: 'lookup',
      lookupInterval: 3000,
      addressRotation: true,
    }
  }
  return config;
};
