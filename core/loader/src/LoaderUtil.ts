import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import BuiltinModule from 'node:module';
import { isClass } from 'is-type-of';

// Guard against poorly mocked module constructors.
const Module = globalThis.module?.constructor?.length > 1
  ? globalThis.module.constructor
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

  static supportExtensions() {
    const extensions = Object.keys((Module as any)._extensions);
    if (process.env.VITEST === 'true' && !extensions.includes('.ts')) {
      extensions.push('.ts');
    }
    return extensions;
  }

  static get extension() {
    return LoaderUtil.supportExtensions().includes('.ts') ? '.ts' : '.js';
  }

  static filePattern(): string[] {
    const extensions = LoaderUtil.supportExtensions();
    const extensionPattern = extensions.map(t => t.substring(1))
      // JSON file will not export class
      .filter(t => t !== 'json')
      .join('|');

    const filePattern = [
      // load file end with node module allow extensions
      `**/*.(${extensionPattern})`,
      // not load files in .xxx/
      '!**/+(.*)/**',
      // not load node module
      '!**/node_modules',
      // node load type definitions
      '!**/*.d.ts',
      // not load test/coverage files
      '!**/test',
      '!**/coverage',
      // extra file pattern
      ...(this.config.extraFilePattern || []),
    ];

    return filePattern;
  }

  static async loadFile(filePath: string): Promise<EggProtoImplClass[]> {
    let exports;
    try {
      exports = await import(filePath);
    } catch (e: any) {
      e.message = '[tegg/loader] load ' + filePath + ' failed: ' + e.message;
      throw e;
    }
    const clazzList: EggProtoImplClass[] = [];
    const exportNames = Object.keys(exports);
    for (const exportName of exportNames) {
      const clazz = exports[exportName];
      const isEggProto = isClass(clazz) && (PrototypeUtil.isEggPrototype(clazz) || PrototypeUtil.isEggMultiInstancePrototype(clazz));
      if (!isEggProto) {
        continue;
      }
      clazzList.push(clazz);
    }
    return clazzList;
  }
}
