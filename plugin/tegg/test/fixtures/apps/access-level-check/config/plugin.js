'use strict';

const path = require('path');

exports.tracer = {
  path: path.join(__dirname, '../../../../../node_modules/egg-tracer'),
  enable: true,
};

exports.tegg = {
  path: path.join(__dirname, '../../../../..'),
  enable: true,
};

exports.teggConfig = {
  package: '@eggjs/tegg-config',
  enable: true,
};

exports.watcher = false;
