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
      enable: false,
    },
    mcp: {
      proxyConnectTimeout: 30000,
    },
  };
  return config;
};
