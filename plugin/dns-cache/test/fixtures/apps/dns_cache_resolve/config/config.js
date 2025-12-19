'use strict';

module.exports = function () {
  const config = {
    keys: 'test key',
    httpclient: {
      httpAgent: {
        keepAlive: false,
        timeout: 30000,
      },
    },
    dnsCache: {
      mode: 'resolve',
      addressRotation: true,
    }
  }
  return config;
};
