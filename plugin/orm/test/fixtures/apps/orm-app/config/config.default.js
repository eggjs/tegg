'use strict';

module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
    orm: {
      client: 'mysql',
      database: 'test',
      host: 'localhost',
      port: 3306,
      user: 'root',

      delegate: 'model',
      baseDir: 'model',
      migrations: 'database',

      define: {
        underscored: true,
      },
    },
  };
  return config;
};
