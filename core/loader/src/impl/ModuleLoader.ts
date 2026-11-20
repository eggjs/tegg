import globby from 'globby';
import path from 'node:path';
import { EventLoopYieldUtil } from '@eggjs/tegg-common-util';
import { LoaderUtil } from '../LoaderUtil';
import type { EggProtoImplClass, LoadAsyncOptions, Loader } from '@eggjs/tegg-types';
import { DEFAULT_ASYNC_LOAD_YIELD_INTERVAL_MS, LoaderFactory } from '../LoaderFactory';

export class ModuleLoader implements Loader {
  private readonly moduleDir: string;
  private protoClazzList: EggProtoImplClass[];
  private loadPromise?: Promise<EggProtoImplClass[]>;

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

  async loadAsync(options?: LoadAsyncOptions): Promise<EggProtoImplClass[]> {
    if (this.protoClazzList) {
      return this.protoClazzList;
    }
    if (this.loadPromise) {
      return await this.loadPromise;
    }

    this.loadPromise = this.doLoadAsync(options);
    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = undefined;
    }
  }

  private async doLoadAsync(options?: LoadAsyncOptions): Promise<EggProtoImplClass[]> {
    const protoClassList: EggProtoImplClass[] = [];
    const filePattern = LoaderUtil.filePattern();
    const files = await globby(filePattern, { cwd: this.moduleDir });
    const yieldIntervalMs = options?.yieldIntervalMs ?? DEFAULT_ASYNC_LOAD_YIELD_INTERVAL_MS;
    const eventLoopYield = new EventLoopYieldUtil(yieldIntervalMs);

    for (const file of files) {
      const realPath = path.join(this.moduleDir, file);
      const fileClazzList = LoaderUtil.loadFile(realPath);
      for (const clazz of fileClazzList) {
        protoClassList.push(clazz);
      }
      const yieldTask = eventLoopYield.yieldIfNeeded();
      if (yieldTask) {
        await yieldTask;
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
