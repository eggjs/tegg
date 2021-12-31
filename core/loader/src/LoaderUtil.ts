import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import BuiltinModule from 'module';
import is from 'is-type-of';

// Guard against poorly mocked module constructors.
const Module = module.constructor.length > 1
  ? module.constructor
  /* istanbul ignore next */
  : BuiltinModule;

interface LoaderUtilConfig {
  extraFilePattern?: string[];
}

export class LoaderUtil {
  static config: LoaderUtilConfig = {};
  static setConfig(config: LoaderUtilConfig) {
    this.config = config;
  }

  static filePattern(): string[] {
    const extensions = Object.keys((Module as any)._extensions);
    const extensionPattern = extensions.map(t => t.substring(1))
      // JSON file will not export class
      .filter(t => t !== 'json')
      .join('|');

    const filePattern = [
      // load file end with node module allow extensions
      `**/*.(${extensionPattern})`,
      // not load files in .xxx/
      '!+(.*)/**',
      // not load node module
      '!**/node_modules',
      // node load type defintions
      '!**/*.d.ts',
      // not load test/coverage files
      '!**/test',
      '!**/coverage',
      // extra file pattern
      ...(this.config.extraFilePattern || []),
    ];

    return filePattern;
  }

  static loadFile(filePath: string): EggProtoImplClass[] {
    let exports;
    try {
      exports = require(filePath);
    } catch (e) {
      e.message = '[tegg/loader] load ' + filePath + ' failed: ' + e.message;
      throw e;
    }
    const clazzList: EggProtoImplClass[] = [];
    const exportNames = Object.keys(exports);
    for (const exportName of exportNames) {
      const clazz = exports[exportName];
      if (!is.class(clazz) || !PrototypeUtil.isEggPrototype(clazz)) {
        continue;
      }
      clazzList.push(clazz);
    }
    return clazzList;
  }
}
