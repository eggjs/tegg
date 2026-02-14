'use strict';

module.exports = appInfo => {
  const config = {};
  config.keys = appInfo.name + '_keys';
  return config;
};
