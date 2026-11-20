'use strict';

const path = require('path');

module.exports = function(appInfo) {
  const config = {
    keys: 'test key',
    tegg: {
      asyncLoad: true,
    },
    customLogger: {
      xxLogger: {
        file: path.join(appInfo.root, 'logs/xx.log'),
      },
    },
    security: {
      csrf: {
        ignoreJSON: false,
      }
    },
  };
  return config;
};
