const ROOT_EXPORTS_VALUE = {
  module: "esm/index.js",
  exports: {
    ".": {
      import: {
        types: "./esm/index.d.ts",
        default: "./esm/index.js",
      },
      require: {
        types: "./index.d.ts",
        default: "./index.js",
      },
    },
    "./*": {
      import: {
        types: "./esm/*.d.ts",
        default: "./esm/*.js",
      },
      require: {
        types: "./*.d.ts",
        default: "./*.js",
      },
    },
  },
};

const DIST_EXPORTS_VALUE = {
  module: "esm/index.js",
  exports: {
    ".": {
      import: {
        types: "./esm/index.d.ts",
        default: "./esm/index.js",
      },
      require: {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
    },
  },
};

const ROOT_PACKAGE_NAMES = ["@eggjs/tegg"];

module.exports = {
  ROOT_EXPORTS_VALUE,
  DIST_EXPORTS_VALUE,
  ROOT_PACKAGE_NAMES,
};
