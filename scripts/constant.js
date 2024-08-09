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
    "./*": {
      import: {
        types: "./esm/*.d.ts",
        default: "./esm/*.js",
      },
      require: {
        types: "./dist/*.d.ts",
        default: "./dist/*.js",
      },
    },
  },
};

const ROOT_PACKAGE_NAMES = ["@eggjs/tegg"];

const IGNORE_DIR = ["dist", "node_modules", "test", "esm"];

module.exports = {
  ROOT_EXPORTS_VALUE,
  DIST_EXPORTS_VALUE,
  ROOT_PACKAGE_NAMES,
  IGNORE_DIR,
};
