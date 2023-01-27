'use strict';

module.exports = function () {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
    orm: {
      datasources: [
        {
          client: 'mysql',
          database: 'test',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',

          delegate: 'model',
          baseDir: 'model',
          migrations: 'database',

          define: {
            underscored: true,
          },
        },
        {
          client: 'mysql',
          database: 'apple',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',

          delegate: 'model',
          baseDir: 'model',
          migrations: 'database',

          define: {
            underscored: true,
          },
        },
        {
          client: 'mysql',
          database: 'banana',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',

          delegate: 'model',
          baseDir: 'model',
          migrations: 'database',

          define: {
            underscored: true,
          },
        },
      ],
    },
  };
  return config;
};
