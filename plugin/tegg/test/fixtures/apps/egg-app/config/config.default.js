'use strict';

const path = require('path');

module.exports = function(appInfo) {
  const config = {
    keys: 'test key',
    configclientManager: {
      default: {
        type: 'alipay',
      }
    },
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
      },
    },
    userservice: {
      type: 'xsession',
    },
    antbuserviceuserservice: {
      appId: 'mock_app_id',
      appKey: 'mock_app_id',
      secretKey: 'mock_app_id',
    },
    security: {
      csrf: {
        ignoreJSON: false,
      }
    },
  };
  return config;
};
