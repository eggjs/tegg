import { Application } from 'egg';
import { Loader, TeggError } from '@eggjs/tegg-metadata';
import {
  AccessLevel,
  EggProtoImplClass, InitTypeQualifierAttribute, LoadUnitNameQualifierAttribute,
  ObjectInitType,
  PrototypeUtil,
  QualifierUtil,
} from '@eggjs/tegg';
import { FrameworkErrorFormater } from 'egg-errors';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { COMPATIBLE_PROTO_IMPLE_TYPE } from './EggCompatibleProtoImpl';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import { EggContextObjectFactory, EggSingletonObjectFactory } from '@eggjs/tegg-dynamic-inject-runtime';

const APP_CLAZZ_BLACK_LIST = [ 'eggObjectFactory' ];
const DEFAULT_APP_CLAZZ = [];
const DEFAULT_CONTEXT_CLAZZ = [
  'user',
];

export class EggAppLoader implements Loader {
  private readonly app: Application;

  constructor(app) {
    this.app = app;
  }

  private buildAppClazz(name: string): EggProtoImplClass {
    const app = this.app;
    const func: EggProtoImplClass = function() {
      return app[name];
    } as any;
    PrototypeUtil.setIsEggPrototype(func);
    PrototypeUtil.setFilePath(func, 'mock_file_path');
    PrototypeUtil.setProperty(func, {
      name,
      initType: ObjectInitType.SINGLETON,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: COMPATIBLE_PROTO_IMPLE_TYPE,
    });
    QualifierUtil.addProtoQualifier(func, LoadUnitNameQualifierAttribute, 'app');
    QualifierUtil.addProtoQualifier(func, InitTypeQualifierAttribute, ObjectInitType.SINGLETON);
    return func;
  }

  private buildCtxClazz(name: string): EggProtoImplClass {
    const temp = {
      [name]: function(ctx) {
        if (!ctx) {
          // ctx has been destroyed, throw humanize error info
          throw TeggError.create(`Can not read property \`${name}\` because egg ctx has been destroyed`, 'read_after_ctx_destroyed');
        }

        return ctx[name];
      } as any,
    };
    const func = temp[name];
    PrototypeUtil.setIsEggPrototype(func);
    PrototypeUtil.setFilePath(func, 'mock_file_path');
    PrototypeUtil.setProperty(func, {
      name,
      initType: ObjectInitType.CONTEXT,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: COMPATIBLE_PROTO_IMPLE_TYPE,
    });
    QualifierUtil.addProtoQualifier(func, LoadUnitNameQualifierAttribute, 'app');
    QualifierUtil.addProtoQualifier(func, InitTypeQualifierAttribute, ObjectInitType.CONTEXT);
    return func;
  }

  private buildAppLoggerClazz(name: string): EggProtoImplClass {
    const app = this.app;
    const func: EggProtoImplClass = function() {
      return app.getLogger(name);
    } as any;
    PrototypeUtil.setIsEggPrototype(func);
    PrototypeUtil.setFilePath(func, 'mock_file_path');
    PrototypeUtil.setProperty(func, {
      name,
      initType: ObjectInitType.SINGLETON,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: COMPATIBLE_PROTO_IMPLE_TYPE,
    });
    QualifierUtil.addProtoQualifier(func, LoadUnitNameQualifierAttribute, 'app');
    QualifierUtil.addProtoQualifier(func, InitTypeQualifierAttribute, ObjectInitType.SINGLETON);
    return func;
  }

  private buildCtxLoggerClazz(name: string): EggProtoImplClass {
    const temp = {
      [name]: function(ctx) {
        return ctx.getLogger(name);
      } as any,
    };
    const func = temp[name];
    PrototypeUtil.setIsEggPrototype(func);
    PrototypeUtil.setFilePath(func, 'mock_file_path');
    PrototypeUtil.setProperty(func, {
      name,
      initType: ObjectInitType.CONTEXT,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: COMPATIBLE_PROTO_IMPLE_TYPE,
    });
    QualifierUtil.addProtoQualifier(func, LoadUnitNameQualifierAttribute, 'app');
    QualifierUtil.addProtoQualifier(func, InitTypeQualifierAttribute, ObjectInitType.CONTEXT);
    return func;
  }

  private getLoggerNames(ctxClazzNames: string[]): string[] {
    const loggerNames = Array.from(this.app.loggers.keys());
    // filter logger/coreLogger
    return loggerNames.filter(t => !ctxClazzNames.includes(t));
  }

  load(): EggProtoImplClass[] {
    const app = this.app;
    const appProperties = ObjectUtils.getProperties(app);
    const contextProperties = ObjectUtils.getProperties((app as any).context);
    // custom plugin may define property conflict with default list
    const allSingletonClazzNameSet = new Set([
      ...appProperties,
      ...DEFAULT_APP_CLAZZ,
    ]);
    APP_CLAZZ_BLACK_LIST.forEach(t => allSingletonClazzNameSet.delete(t));
    const allSingletonClazzNames = Array.from(allSingletonClazzNameSet);
    const allContextClazzNames = Array.from(new Set([
      ...contextProperties,
      ...DEFAULT_CONTEXT_CLAZZ,
    ]));
    const loggerNames = this.getLoggerNames(allContextClazzNames);
    const allSingletonClazzs = allSingletonClazzNames.map(name => this.buildAppClazz(name));
    const allContextClazzs = allContextClazzNames.map(name => this.buildCtxClazz(name));
    const appLoggerClazzs = loggerNames.map(name => this.buildAppLoggerClazz(name));
    const ctxLoggerClazzs = loggerNames.map(name => this.buildCtxLoggerClazz(name));

    return [
      ...allSingletonClazzs,
      ...allContextClazzs,
      ...appLoggerClazzs,
      ...ctxLoggerClazzs,

      // inner helper class list
      // TODO: should auto the inner class
      BackgroundTaskHelper,
      EggContextObjectFactory,
      EggSingletonObjectFactory,
    ];
  }
}
