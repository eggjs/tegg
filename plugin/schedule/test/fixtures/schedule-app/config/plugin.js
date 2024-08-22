'use strict';

const path = require('path');

exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggConfig = {
  package: '@eggjs/tegg-config',
  enable: true,
};

exports.teggSchedule = {
  path: path.join(__dirname, '../../../..'),
  enable: true,
};
