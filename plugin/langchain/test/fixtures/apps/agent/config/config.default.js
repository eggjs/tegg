'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        enable: false,
      },
    },
    bodyParser: {
      enable: true,
    },
  };
  return config;
};
