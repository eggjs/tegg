import {
  MultiInstanceProto,
  MultiInstancePrototypeGetObjectsContext,
  LifecycleInit,
  LifecycleDestroy,
  QualifierUtil,
  EggProtoImplClass,
  AccessLevel,
} from '@eggjs/tegg';
import { EggObject, ModuleConfigUtil, EggObjectLifeCycleContext } from '@eggjs/tegg/helper';
import fs from 'node:fs';
import { Writable } from 'node:stream';
import path from 'node:path';
import { EOL } from 'node:os';

export const LOG_PATH_ATTRIBUTE = Symbol.for('LOG_PATH_ATTRIBUTE');

export function LogPath(name: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, LOG_PATH_ATTRIBUTE, name);
  };
}


@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath);
    const logger = (config as any)?.features.logger;
    if (!logger) {
      return [];
    }
    return logger.map(name => {
      return {
        name: 'dynamicLogger',
        qualifiers: [{
          attribute: LOG_PATH_ATTRIBUTE,
          value: name,
        }],
      };
    });
  },
})
export class DynamicLogger {
  stream: Writable;
  loggerName: string;

  @LifecycleInit()
  async init(ctx: EggObjectLifeCycleContext, obj: EggObject) {
    const loggerName = obj.proto.getQualifier(LOG_PATH_ATTRIBUTE);
    this.loggerName = loggerName as string;
    this.stream = fs.createWriteStream(path.join(ctx.loadUnit.unitPath, `${loggerName}.log`));
  }

  @LifecycleDestroy()
  async destroy() {
    return new Promise<void>((resolve, reject) => {
      this.stream.end(err => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  info(msg: string) {
    return new Promise<void>((resolve, reject) => {
      this.stream.write(msg + EOL, err => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

}
