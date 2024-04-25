const path = require("path");
const fs = require("fs/promises");
const {
  ROOT_EXPORTS_VALUE,
  DIST_EXPORTS_VALUE,
  ROOT_PACKAGE_NAMES,
  IGNORE_DIR,
} = require("./constant");

// 创建需要插入的 exports
const getExports = (paths, isRoot) => {
  const res = isRoot ? ROOT_EXPORTS_VALUE : DIST_EXPORTS_VALUE;

  // 每个子目录都需要
  for (const p of paths) {
    res.exports[isRoot ? `./${p}/*` : `./src/${p}/*`] = {
      import: {
        types: isRoot ? `./esm/${p}/*.d.ts` : `./esm/src/${p}/*.d.ts`,
        default: isRoot ? `./esm/${p}/*.js` : `./esm/src/${p}/*.js`,
      },
      require: {
        types: isRoot ? `./${p}/*.d.ts` : `./lib/${p}/*.d.ts`,
        default: isRoot ? `./${p}/*.js` : `./lib/${p}/*.js`,
      },
    };
  }

  return res;
};

// get all sub dir
const traverseFolder = async (directory, arr, root) => {
  const res = arr ?? [];
  const files = await fs.readdir(directory);

  for (const file of files) {
    if (IGNORE_DIR.includes(file)) {
      continue;
    }
    const filePath = path.join(directory, file);

    const isDirectory = (await fs.stat(filePath)).isDirectory();

    if (isDirectory) {
      res.push(path.relative(root ?? directory, filePath));

      await traverseFolder(filePath, res, root ?? directory);
    }
  }

  return res;
};

(async () => {
  const dir = path.join(process.cwd(), "esm");

  await fs.mkdir(dir, { recursive: true });

  const esmPackageJSON = path.join(dir, "package.json");

  await fs.writeFile(esmPackageJSON, '{ "type": "module" }');

  const pkgPath = path.join(process.cwd(), "package.json");

  const pkg = await fs.readFile(pkgPath, "utf-8");

  let pkgJSON = JSON.parse(pkg);

  const isRoot = ROOT_PACKAGE_NAMES.includes(pkgJSON.name);

  const paths = await traverseFolder(
    isRoot ? process.cwd() : path.join(process.cwd(), "src")
  );

  pkgJSON = {
    ...pkgJSON,
    ...getExports(paths),
  };

  await fs.writeFile(pkgPath, JSON.stringify(pkgJSON, null, 2));
})();
