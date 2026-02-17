// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// Enable tegg in this fixture app so we can test `ctx.getEggObject()`.
// NOTE: use local plugin paths (monorepo) instead of installing deps.
const teggRoot = path.join(__dirname, '../../../../../../..');

exports.teggConfig = {
  enable: true,
  path: path.join(teggRoot, 'plugin/config'),
};

exports.tegg = {
  enable: true,
  path: path.join(teggRoot, 'plugin/tegg'),
};
