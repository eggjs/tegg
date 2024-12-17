const path = require("path");
const fs = require("fs/promises");

(async () => {
  const dir = path.join(process.cwd(), "esm");

  await fs.rm(dir, { recursive: true, force: true });

  const pkgPath = path.join(process.cwd(), "package.json");

  const pkg = await fs.readFile(pkgPath, "utf-8");

  let pkgJSON = JSON.parse(pkg);

  delete pkgJSON["exports"];

  delete pkgJSON["module"];

  await fs.writeFile(pkgPath, JSON.stringify(pkgJSON, null, 2));
})();
