import { LoadUnitLifecycleContext, LoadUnit } from '@eggjs/tegg-metadata';
import {
  LifecycleHook,
  PrototypeUtil,
  QualifierUtil,
  EggQualifierAttribute,
  EggType,
} from '@eggjs/tegg';
import { Application } from 'egg';
import {
  APP_CLAZZ_BLACK_LIST,
  CONTEXT_CLAZZ_BLACK_LIST,
  DEFAULT_APP_CLAZZ,
  DEFAULT_CONTEXT_CLAZZ,
} from './EggAppLoader';
import { ObjectUtils } from '@eggjs/tegg-common-util';

export class EggQualifierProtoHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async preCreate(ctx: LoadUnitLifecycleContext): Promise<void> {
    const clazzList = ctx.loader.load();
    const appProperties = ObjectUtils.getProperties(this.app);
    const ctxProperties = ObjectUtils.getProperties(this.app.context);
    for (const clazz of clazzList) {
      for (const injectObject of PrototypeUtil.getInjectObjects(clazz) || []) {
        const propertyQualifiers = QualifierUtil.getProperQualifiers(clazz, injectObject.refName);
        const hasEggQualifier = propertyQualifiers.find(t => t.attribute === EggQualifierAttribute);
        if (hasEggQualifier) {
          continue;
        }
        if (this.isCtxObject(injectObject.objName, ctxProperties)) {
          QualifierUtil.addProperQualifier(clazz, injectObject.refName, EggQualifierAttribute, EggType.CONTEXT);
        } else if (this.isAppObject(injectObject.objName, appProperties)) {
          QualifierUtil.addProperQualifier(clazz, injectObject.refName, EggQualifierAttribute, EggType.APP);
        }
      }
    }
  }

  private isAppObject(name: PropertyKey, appProperties: string[]) {
    name = String(name);
    if (APP_CLAZZ_BLACK_LIST.includes(name)) {
      return false;
    }
    if (DEFAULT_APP_CLAZZ.includes(name)) {
      return true;
    }
    return appProperties.includes(name);
  }

  private isCtxObject(name: PropertyKey, ctxProperties: string[]) {
    name = String(name);
    if (CONTEXT_CLAZZ_BLACK_LIST.includes(name)) {
      return false;
    }
    if (DEFAULT_CONTEXT_CLAZZ.includes(name)) {
      return true;
    }
    return ctxProperties.includes(name);
  }
}
