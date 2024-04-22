const path = require("path");
const fs = require("fs/promises");
const {
  ROOT_EXPORTS_VALUE,
  DIST_EXPORTS_VALUE,
  ROOT_PACKAGE_NAMES,
} = require("./constant");

(async () => {
  const dir = path.join(process.cwd(), "esm");

  await fs.mkdir(dir, { recursive: true });

  const esmPackageJSON = path.join(dir, "package.json");

  await fs.writeFile(esmPackageJSON, '{ "type": "module" }');

  const pkgPath = path.join(process.cwd(), "package.json");

  const pkg = await fs.readFile(pkgPath, "utf-8");

  let pkgJSON = JSON.parse(pkg);

  pkgJSON = {
    ...pkgJSON,
    ...(ROOT_PACKAGE_NAMES.includes(pkgJSON.name)
      ? ROOT_EXPORTS_VALUE
      : DIST_EXPORTS_VALUE),
  };

  await fs.writeFile(pkgPath, JSON.stringify(pkgJSON, null, 2));
})();
