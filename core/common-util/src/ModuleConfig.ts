import assert from 'assert';
import yaml from 'js-yaml';
import fs, { promises as fsPromise } from 'fs';
import path from 'path';
import globby from 'globby';
import { FSUtil } from './FSUtil';
import extend from 'extend2';

export interface ModuleReference {
  name: string;
  path: string;
}

export interface InlineModuleReferenceConfig {
  path: string;
}

export interface NpmModuleReferenceConfig {
  package: string;
}

export type ModuleReferenceConfig = InlineModuleReferenceConfig | NpmModuleReferenceConfig;

export class ModuleReferenceConfigHelp {
  static isInlineModuleReference(moduleReference: ModuleReferenceConfig): moduleReference is InlineModuleReferenceConfig {
    return !!(moduleReference as InlineModuleReferenceConfig).path;
  }

  static isNpmModuleReference(moduleReference: ModuleReferenceConfig): moduleReference is NpmModuleReferenceConfig {
    return !!(moduleReference as NpmModuleReferenceConfig).package;
  }
}

export interface ModuleConfig {
}

export interface ReadModuleReferenceOptions {
  // module dir deep for globby when use auto scan module
  // default is 10
  deep?: number;
  cwd?: string;
  extraFilePattern?: string[];
}

const DEFAULT_READ_MODULE_REF_OPTS = {
  deep: 10,
};

export class ModuleConfigUtil {
  public static moduleYamlPath(modulePath: string, env?: string): string {
    if (env) {
      return path.join(modulePath, `module.${env}.yml`);
    }
    return path.join(modulePath, 'module.yml');
  }

  public static moduleJsonPath(modulePath: string, env?: string): string {
    if (env) {
      return path.join(modulePath, `module.${env}.json`);
    }
    return path.join(modulePath, 'module.json');
  }

  public static readModuleReference(baseDir: string, options?: ReadModuleReferenceOptions): readonly ModuleReference[] {
    // 1. module.json exits use module.json as module reference
    // 1. module.json not exits scan baseDir get package.json to find modules
    const configDir = path.join(baseDir, 'config');
    const moduleJsonPath = path.join(configDir, 'module.json');
    if (fs.existsSync(moduleJsonPath)) {
      return this.readModuleReferenceFromModuleJson(configDir, moduleJsonPath, options?.cwd || baseDir);
    }
    return this.readModuleReferenceFromScan(baseDir, options);
  }

  private static readModuleReferenceFromModuleJson(configDir: string, moduleJsonPath: string, cwd?: string): readonly ModuleReference[] {
    const moduleJsonContent = fs.readFileSync(moduleJsonPath, 'utf8');
    const moduleJson: ModuleReferenceConfig[] = JSON.parse(moduleJsonContent);
    const moduleReferenceList: ModuleReference[] = [];
    for (const moduleReferenceConfig of moduleJson) {
      let moduleReference: ModuleReference;
      if (ModuleReferenceConfigHelp.isNpmModuleReference(moduleReferenceConfig)) {
        const options = cwd ? { paths: [ cwd ] } : {};
        // path.posix for windows keep path as foo/package.json
        const pkgJson = path.posix.join(moduleReferenceConfig.package, 'package.json');
        const file = require.resolve(pkgJson, options);
        const modulePath = path.dirname(file);
        moduleReference = {
          path: modulePath,
          name: ModuleConfigUtil.readModuleNameSync(modulePath),
        };
      } else if (ModuleReferenceConfigHelp.isInlineModuleReference(moduleReferenceConfig)) {
        const modulePath = path.join(configDir, moduleReferenceConfig.path);
        moduleReference = {
          path: modulePath,
          name: ModuleConfigUtil.readModuleNameSync(modulePath),
        };
      } else {
        throw new Error('unknown type of module reference config: ' + JSON.stringify(moduleReferenceConfig));
      }
      moduleReferenceList.push(moduleReference);
    }
    return moduleReferenceList;
  }

  private static readModuleReferenceFromScan(baseDir: string, options?: ReadModuleReferenceOptions): readonly ModuleReference[] {
    const ref: ModuleReference[] = [];
    const realOptions: ReadModuleReferenceOptions = Object.assign({}, DEFAULT_READ_MODULE_REF_OPTS, options);
    const packagePaths = globby.sync([
      '**/package.json',
      // not load node_modules
      '!**/node_modules',
      // not load files in .xxx/
      '!**/+(.*)/**',
      // not load coverage
      '!**/coverage',
      ...(realOptions.extraFilePattern || []),
    ], {
      cwd: baseDir,
      deep: realOptions.deep,
    });
    const moduleDirSet = new Set<string>();
    for (const packagePath of packagePaths) {
      const absolutePkgPath = path.join(baseDir, packagePath);
      let realPkgPath;
      try {
        realPkgPath = fs.realpathSync(absolutePkgPath);
      } catch (_) {
        continue;
      }

      const moduleDir = path.dirname(realPkgPath);

      // skip the symbolic link
      if (moduleDirSet.has(moduleDir)) {
        continue;
      }
      moduleDirSet.add(moduleDir);

      let name: string;
      try {
        name = this.readModuleNameSync(moduleDir);
      } catch (_) {
        continue;
      }
      ref.push({
        path: moduleDir,
        name,
      });
    }
    const moduleReferences = this.readModuleFromNodeModules(baseDir);
    for (const moduleReference of moduleReferences) {
      const moduleBasePath = path.basename(moduleReference.path);
      moduleDirSet.forEach(modulePath => {
        if (path.basename(modulePath) === moduleBasePath) {
          throw new Error('duplicate import of module reference: ' + moduleBasePath);
        }
      });
      ref.push({
        path: moduleReference.path,
        name: moduleReference.name,
      });
    }
    return ref;
  }

  public static readModuleFromNodeModules(baseDir: string) {
    const ref: ModuleReference[] = [];
    let pkgContent: string;
    try {
      pkgContent = fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8');
    } catch (_) {
      return [];
    }
    const pkg = JSON.parse(pkgContent);
    for (const dependencyKey of Object.keys(pkg.dependencies || {})) {
      let packageJsonPath: string;
      try {
        // https://nodejs.org/api/packages.html#package-entry-points
        // ignore cases where the package entry is exports but package.json is not exported
        packageJsonPath = require.resolve(`${dependencyKey}/package.json`, { paths: [ baseDir ] });
      } catch (_) {
        continue;
      }
      const absolutePkgPath = path.dirname(packageJsonPath);
      const realPkgPath = fs.realpathSync(absolutePkgPath);
      try {
        const name = this.readModuleNameSync(realPkgPath);
        ref.push({
          path: realPkgPath,
          name,
        });
      } catch (_) {
        continue;
      }
    }
    return ref;
  }

  public static resolveModuleDir(moduleDir: string, baseDir?: string): string {
    if (path.isAbsolute(moduleDir)) {
      return moduleDir;
    }
    assert(baseDir, 'baseDir is required');
    return path.join(baseDir, 'config', moduleDir);
  }

  private static getModuleName(pkg: any) {
    assert(pkg.eggModule && pkg.eggModule.name, 'eggModule.name not found in package.json');
    return pkg.eggModule.name;
  }

  public static async readModuleName(baseDir: string, moduleDir: string): Promise<string> {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const pkgContent = await fsPromise.readFile(path.join(moduleDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    return ModuleConfigUtil.getModuleName(pkg);
  }

  public static readModuleNameSync(moduleDir: string, baseDir?: string): string {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const pkgContent = fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    return ModuleConfigUtil.getModuleName(pkg);
  }

  public static async loadModuleConfig(moduleDir: string, baseDir?: string, env?: string): Promise<ModuleConfig | undefined> {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    let defaultConfig = await ModuleConfigUtil.loadModuleYaml(moduleDir);
    if (!defaultConfig) {
      defaultConfig = await ModuleConfigUtil.loadModuleJson(moduleDir);
    }
    let envConfig: ModuleConfig | undefined;
    if (env) {
      envConfig = await ModuleConfigUtil.loadModuleYaml(moduleDir, env);
      if (!envConfig) {
        envConfig = await ModuleConfigUtil.loadModuleJson(moduleDir, env);
      }
    }
    extend(true, defaultConfig, envConfig);
    return defaultConfig;
  }

  private static async loadModuleJson(moduleDir: string, env?: string): Promise<ModuleConfig | undefined> {
    const moduleJsonPath = ModuleConfigUtil.moduleJsonPath(moduleDir, env);
    const moduleJsonPathExists = await FSUtil.fileExists(moduleJsonPath);
    if (!moduleJsonPathExists) {
      return;
    }
    const moduleJsonContent = await fsPromise.readFile(moduleJsonPath, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);
    return moduleJson.config;
  }

  private static async loadModuleYaml(moduleDir: string, env?: string): Promise<ModuleConfig | undefined> {
    const moduleYamlPath = ModuleConfigUtil.moduleYamlPath(moduleDir, env);
    const moduleYamlPathExists = await FSUtil.fileExists(moduleYamlPath);
    if (!moduleYamlPathExists) {
      return;
    }
    const moduleYamlContent = await fsPromise.readFile(moduleYamlPath, 'utf8');
    return yaml.safeLoad(moduleYamlContent) as ModuleConfigUtil;
  }

  public static loadModuleConfigSync(moduleDir: string, baseDir?: string, env?: string): ModuleConfig | undefined {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    let defaultConfig = ModuleConfigUtil.loadModuleYamlSync(moduleDir);
    if (!defaultConfig) {
      defaultConfig = ModuleConfigUtil.loadModuleJsonSync(moduleDir);
    }
    let envConfig: ModuleConfig | undefined;
    if (env) {
      envConfig = ModuleConfigUtil.loadModuleYamlSync(moduleDir, env);
      if (!envConfig) {
        envConfig = ModuleConfigUtil.loadModuleJsonSync(moduleDir, env);
      }
    }
    extend(true, defaultConfig, envConfig);
    return defaultConfig;
  }

  private static loadModuleJsonSync(moduleDir: string, env?: string): ModuleConfig | undefined {
    const moduleJsonPath = ModuleConfigUtil.moduleJsonPath(moduleDir, env);
    const moduleJsonPathExists = fs.existsSync(moduleJsonPath);
    if (!moduleJsonPathExists) {
      return;
    }
    const moduleJsonContent = fs.readFileSync(moduleJsonPath, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);
    return moduleJson.config;
  }

  private static loadModuleYamlSync(moduleDir: string, env?: string): ModuleConfig | undefined {
    const moduleYamlPath = ModuleConfigUtil.moduleYamlPath(moduleDir, env);
    const moduleYamlPathExists = fs.existsSync(moduleYamlPath);
    if (!moduleYamlPathExists) {
      return;
    }
    const moduleYamlContent = fs.readFileSync(moduleYamlPath, 'utf8');
    return yaml.safeLoad(moduleYamlContent) as ModuleConfig;
  }
}
