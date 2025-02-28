import path from 'node:path';
import { globbySync } from 'globby';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import { Loader } from '@eggjs/tegg-metadata';
import { LoaderUtil } from './LoaderUtil.js';

export class TestLoader implements Loader {
  private readonly moduleDir: string;

  constructor(moduleDir: string) {
    this.moduleDir = moduleDir;
  }

  async load(): Promise<EggProtoImplClass[]> {
    const protoClassList: EggProtoImplClass[] = [];
    const files = globbySync([
      '**/*',
      '!**/node_modules',
      '!**/*.d.ts',
    ], { cwd: this.moduleDir });
    for (const file of files) {
      const realPath = path.join(this.moduleDir, file);
      const protoClazz = await LoaderUtil.loadFile(realPath);
      if (!protoClazz) {
        continue;
      }
      protoClassList.push(protoClazz);
    }
    return protoClassList;
  }
}
