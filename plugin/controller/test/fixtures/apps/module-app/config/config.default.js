'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      }
    },
    trserver: {
      namespace: 'com.alipay.tegg.trserver'
    },
    configclientManager: {
      default: {
        type: 'alipay',
      },
    },
    zoneclient: {
      zdrmdataRestUrl: 'http://zdrmdata-pool.stable.alipay.net',
    },
    zone: 'GZ00B',
    controller: {
      supportParams: true,
    },
  };
  return config;
};
