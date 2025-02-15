module.exports = function() {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config;
};
