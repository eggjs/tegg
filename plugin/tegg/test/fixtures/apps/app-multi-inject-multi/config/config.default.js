'use strict';

const path = require('path');

module.exports = function(appInfo) {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config;
};
