'use strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

exports.tracer = {
  package: 'egg-tracer',
  enable: true,
};

exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggConfig = {
  package: '@eggjs/tegg-config',
  enable: true,
};

exports.aopModule = {
  package: '@eggjs/tegg-aop-plugin',
  enable: true,
};

exports.mcpProxy = {
  package: '@eggjs/mcp-proxy',
  enable: true,
};


exports.hookPlugin = {
  path: path.join(__dirname, '../hook-plugin'),
  enable: true,
};
