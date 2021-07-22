'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      }
    },
  };
  return config;
};

exports.teggConfig = {
  package: '@eggjs/tegg-config',
  enable: true,
};
