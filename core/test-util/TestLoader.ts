import globby from 'globby';
import path from 'path';

import { LoaderUtil } from './LoaderUtil';
import { EggProtoImplClass } from '@eggjs/core-decorator';
import { Loader } from '@eggjs/tegg-metadata';

export class TestLoader implements Loader {
  private readonly moduleDir: string;

  constructor(moduleDir: string) {
    this.moduleDir = moduleDir;
  }

  load(): EggProtoImplClass[] {
    const protoClassList: EggProtoImplClass[] = [];
    const files = globby.sync([
      '**/*',
      '!**/node_modules',
      '!**/*.d.ts',
    ], { cwd: this.moduleDir });
    for (const file of files) {
      const realPath = path.join(this.moduleDir, file);
      const protoClazz = LoaderUtil.loadFile(realPath);
      if (!protoClazz) {
        continue;
      }
      protoClassList.push(protoClazz);
    }
    return protoClassList;
  }
}
