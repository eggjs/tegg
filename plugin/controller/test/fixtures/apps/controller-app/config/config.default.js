'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    proxy: true,
    hostHeaders: 'x-forwarded-host',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config;
};
