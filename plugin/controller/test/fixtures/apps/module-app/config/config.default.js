'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: false,
    },
    controller: {
      supportParams: true,
    },
  };
  return config;
};
