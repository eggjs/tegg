const path = require('path');

exports.tracer = {
  path: '@eggjs/tracer',
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
