import globby from 'globby';
import path from 'node:path';
import { LoaderUtil } from '@eggjs/tegg-loader';
import { EggProtoImplClass } from '@eggjs/tegg';

export class EggControllerLoader {
  private readonly controllerDir: string;

  constructor(controllerDir: string) {
    this.controllerDir = controllerDir;
  }

  load(): EggProtoImplClass[] {
    const filePattern = LoaderUtil.filePattern();
    let files: string[];
    try {
      const httpControllers = globby.sync(filePattern, { cwd: this.controllerDir })
        .map(file => path.join(this.controllerDir, file));
      files = httpControllers;
    } catch (_) {
      files = [];
      // app/controller dir not exists
    }
    const protoClassList: EggProtoImplClass[] = [];
    for (const file of files) {
      const fileClazzList = LoaderUtil.loadFile(file);
      for (const clazz of fileClazzList) {
        protoClassList.push(clazz);
      }
    }
    return protoClassList;
  }
}
