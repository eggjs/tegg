import { ModuleConfigUtil, ModuleReference, ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import path from 'path';

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ReadModuleReferenceOptions;

  constructor(baseDir: string, readModuleOptions: ReadModuleReferenceOptions) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
  }

  /**
   * - load module references from config or scan from baseDir
   * - load framework module as optional module reference
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const moduleReferences = ModuleConfigUtil.readModuleReference(this.baseDir, this.readModuleOptions || {});
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appPkg = require(path.join(this.baseDir, 'package.json'));
    const framework = appPkg.egg?.framework;
    if (!framework) {
      return ModuleConfigUtil.deduplicateModules(moduleReferences);
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const frameworkPkg = require.resolve(`${framework}/package.json`, {
      paths: [ this.baseDir ],
    });
    const frameworkDir = path.dirname(frameworkPkg);
    const optionalModuleReferences = ModuleConfigUtil.readModuleReference(frameworkDir, this.readModuleOptions || {});

    // 合并所有模块引用并去重
    const allModuleReferences = [
      ...moduleReferences,
      ...optionalModuleReferences.map(ref => ({ ...ref, optional: true })),
    ];

    return ModuleConfigUtil.deduplicateModules(allModuleReferences);
  }
}
