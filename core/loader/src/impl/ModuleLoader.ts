import globby from 'globby';
import path from 'node:path';
import { LoaderUtil } from '../LoaderUtil';
import type { EggProtoImplClass, Loader } from '@eggjs/tegg-types';
import { LoaderFactory } from '../LoaderFactory';

export class ModuleLoader implements Loader {
  private readonly moduleDir: string;
  private protoClazzList: EggProtoImplClass[];

  constructor(moduleDir: string) {
    this.moduleDir = moduleDir;
  }

  load(): EggProtoImplClass[] {
    // optimise for EggModuleLoader
    if (this.protoClazzList) {
      return this.protoClazzList;
    }
    const protoClassList: EggProtoImplClass[] = [];
    const filePattern = LoaderUtil.filePattern();

    const files = globby.sync(filePattern, { cwd: this.moduleDir });
    for (const file of files) {
      const realPath = path.join(this.moduleDir, file);
      const fileClazzList = LoaderUtil.loadFile(realPath);
      for (const clazz of fileClazzList) {
        protoClassList.push(clazz);
      }
    }
    this.protoClazzList = Array.from(new Set(protoClassList));
    return this.protoClazzList;
  }

  static createModuleLoader(path: string): ModuleLoader {
    return new ModuleLoader(path);
  }
}

LoaderFactory.registerLoader('MODULE', ModuleLoader.createModuleLoader);
