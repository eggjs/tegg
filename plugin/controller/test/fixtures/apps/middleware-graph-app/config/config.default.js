'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    tegg: {
      asyncLoad: true,
    },
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config;
};
