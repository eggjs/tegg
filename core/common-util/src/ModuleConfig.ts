import assert from 'assert';
import yaml from 'js-yaml';
import fs, { promises as fsPromise } from 'fs';
import path from 'path';
import globby from 'globby';
import { FSUtil } from './FSUtil';

export interface ModuleReference {
  path: string;
}

export interface ModuleConfig {
}

export interface ReadModuleReferenceOptions {
  // module dir deep for globby when use auto scan module
  // default is 10
  deep?: number,
}

const DEFAULT_READ_MODULE_REF_OPTS = {
  deep: 10,
};

export class ModuleConfigUtil {
  public static moduleYamlPath(modulePath: string): string {
    return path.join(modulePath, 'module.yml');
  }

  public static moduleJsonPath(modulePath: string): string {
    return path.join(modulePath, 'module.json');
  }

  public static readModuleReference(baseDir: string, options?: ReadModuleReferenceOptions): readonly ModuleReference[] {
    // 1. module.json exits use module.json as module reference
    // 1. module.json not exits scan baseDir get package.json to find modules
    const configDir = path.join(baseDir, 'config');
    const moduleJsonPath = path.join(configDir, 'module.json');
    if (fs.existsSync(moduleJsonPath)) {
      return this.readModuleReferenceFromModuleJson(configDir, moduleJsonPath);
    }
    return this.readModuleReferenceFromScan(baseDir, options);
  }

  private static readModuleReferenceFromModuleJson(configDir: string, moduleJsonPath: string): readonly ModuleReference[] {
    const moduleJsonContent = fs.readFileSync(moduleJsonPath, 'utf8');
    const moduleJson: ModuleReference[] = JSON.parse(moduleJsonContent);
    for (const moduleReference of moduleJson) {
      moduleReference.path = path.resolve(configDir, moduleReference.path);
    }
    return moduleJson;
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
      // not load test/coverage
      '!**/test',
      '!**/coverage',
    ], {
      cwd: baseDir,
      deep: realOptions.deep,
    });
    const moduleDirSet = new Set<string>();
    for (const packagePath of packagePaths) {
      const absolutePkgPath = path.join(baseDir, packagePath);
      const realPkgPath = fs.realpathSync(absolutePkgPath);
      const moduleDir = path.dirname(realPkgPath);

      // skip the symbolic link
      if (moduleDirSet.has(moduleDir)) {
        continue;
      }
      moduleDirSet.add(moduleDir);

      try {
        this.readModuleNameSync(moduleDir);
      } catch (_) {
        continue;
      }
      ref.push({
        path: moduleDir,
      });
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

  public static async readModuleName(baseDir: string, moduleDir: string): Promise<string> {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const pkgContent = await fsPromise.readFile(path.join(moduleDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    assert(pkg.eggModule && pkg.eggModule.name, 'eggModule.name not found in package.json');
    return pkg.eggModule.name;
  }

  public static readModuleNameSync(moduleDir: string, baseDir?: string): string {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const pkgContent = fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    assert(pkg.eggModule && pkg.eggModule.name, 'eggModule.name not found in package.json');
    return pkg.eggModule.name;
  }

  public static async loadModuleConfig(moduleDir: string, baseDir?: string): Promise<ModuleConfig | undefined> {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const yamlConfig = await ModuleConfigUtil.loadModuleYaml(moduleDir);
    if (yamlConfig) {
      return yamlConfig;
    }
    return await ModuleConfigUtil.loadModuleJson(moduleDir);
  }

  private static async loadModuleJson(moduleDir: string): Promise<ModuleConfig | undefined> {
    const moduleJsonPath = ModuleConfigUtil.moduleJsonPath(moduleDir);
    const moduleJsonPathExists = await FSUtil.fileExists(moduleJsonPath);
    if (!moduleJsonPathExists) {
      return;
    }
    const moduleJsonContent = await fsPromise.readFile(moduleJsonPath, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);
    return moduleJson.config;
  }

  private static async loadModuleYaml(moduleDir: string): Promise<ModuleConfig | undefined> {
    const moduleYamlPath = ModuleConfigUtil.moduleYamlPath(moduleDir);
    const moduleYamlPathExists = await FSUtil.fileExists(moduleYamlPath);
    if (!moduleYamlPathExists) {
      return;
    }
    const moduleYamlContent = await fsPromise.readFile(moduleYamlPath, 'utf8');
    return yaml.safeLoad(moduleYamlContent) as ModuleConfigUtil;
  }

  public static loadModuleConfigSync(moduleDir: string, baseDir?: string): ModuleConfig | undefined {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const yamlConfig = ModuleConfigUtil.loadModuleYamlSync(moduleDir);
    if (yamlConfig) {
      return yamlConfig;
    }
    return ModuleConfigUtil.loadModuleJsonSync(moduleDir);
  }

  private static loadModuleJsonSync(moduleDir: string): ModuleConfig | undefined {
    const moduleJsonPath = ModuleConfigUtil.moduleJsonPath(moduleDir);
    const moduleJsonPathExists = fs.existsSync(moduleJsonPath);
    if (!moduleJsonPathExists) {
      return;
    }
    const moduleJsonContent = fs.readFileSync(moduleJsonPath, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);
    return moduleJson.config;
  }

  private static loadModuleYamlSync(moduleDir: string): ModuleConfig | undefined {
    const moduleYamlPath = ModuleConfigUtil.moduleYamlPath(moduleDir);
    const moduleYamlPathExists = fs.existsSync(moduleYamlPath);
    if (!moduleYamlPathExists) {
      return;
    }
    const moduleYamlContent = fs.readFileSync(moduleYamlPath, 'utf8');
    return yaml.safeLoad(moduleYamlContent) as ModuleConfig;
  }
}
