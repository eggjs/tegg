'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
    controller: {
      supportParams: true,
    },
  };
  return config;
};
