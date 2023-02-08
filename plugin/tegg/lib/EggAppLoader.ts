import { Application } from 'egg';
import { Loader, TeggError } from '@eggjs/tegg-metadata';
import {
  AccessLevel,
  EggProtoImplClass,
  EggQualifierAttribute,
  EggType,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  ObjectInitType,
  PrototypeUtil,
  QualifierUtil,
} from '@eggjs/tegg';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { COMPATIBLE_PROTO_IMPLE_TYPE } from './EggCompatibleProtoImpl';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import { EggContextObjectFactory, EggSingletonObjectFactory } from '@eggjs/tegg-dynamic-inject-runtime';

export const APP_CLAZZ_BLACK_LIST = [ 'eggObjectFactory' ];
export const DEFAULT_APP_CLAZZ: string[] = [];
export const DEFAULT_CONTEXT_CLAZZ = [
  'user',
];

export class EggAppLoader implements Loader {
  private readonly app: Application;

  constructor(app) {
    this.app = app;
  }

  private buildClazz(name: string, eggType: EggType): EggProtoImplClass {
    const app = this.app;
    let func: EggProtoImplClass;
    if (eggType === EggType.APP) {
      func = function() {
        return app[name];
      } as any;
    } else {
      func = function() {
        const ctx = app.currentContext;
        if (!ctx) {
          // ctx has been destroyed, throw humanize error info
          throw TeggError.create(`Can not read property \`${name}\` because egg ctx has been destroyed`, 'read_after_ctx_destroyed');
        }

        return ctx[name];
      } as any;
    }
    Object.defineProperty(func, 'name', {
      value: name,
      writable: false,
      enumerable: false,
      configurable: true,
    });
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
    QualifierUtil.addProtoQualifier(func, EggQualifierAttribute, eggType);
    return func;
  }

  private buildAppLoggerClazz(name: string): EggProtoImplClass {
    const app = this.app;
    const func: EggProtoImplClass = function() {
      return app.getLogger(name);
    } as any;
    Object.defineProperty(func, 'name', {
      value: name,
      writable: false,
      enumerable: false,
      configurable: true,
    });
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
    QualifierUtil.addProtoQualifier(func, EggQualifierAttribute, EggType.APP);
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
    const allSingletonClazzs = allSingletonClazzNames.map(name => this.buildClazz(name, EggType.APP));
    const allContextClazzs = allContextClazzNames.map(name => this.buildClazz(name, EggType.CONTEXT));
    const appLoggerClazzs = loggerNames.map(name => this.buildAppLoggerClazz(name));

    return [
      ...allSingletonClazzs,
      ...allContextClazzs,
      ...appLoggerClazzs,

      // inner helper class list
      // TODO: should auto the inner class
      BackgroundTaskHelper,
      EggContextObjectFactory,
      EggSingletonObjectFactory,
    ];
  }
}
