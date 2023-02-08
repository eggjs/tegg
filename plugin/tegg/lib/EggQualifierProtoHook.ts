import { LoadUnitLifecycleContext, LoadUnit } from '@eggjs/tegg-metadata';
import {
  LifecycleHook,
  PrototypeUtil,
  QualifierUtil,
  EggQualifierAttribute,
  EggType,
} from '@eggjs/tegg';
import { Application } from 'egg';
import { APP_CLAZZ_BLACK_LIST, DEFAULT_APP_CLAZZ, DEFAULT_CONTEXT_CLAZZ } from './EggAppLoader';

export class EggQualifierProtoHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async preCreate(ctx: LoadUnitLifecycleContext): Promise<void> {
    const clazzList = ctx.loader.load();
    for (const clazz of clazzList) {
      for (const injectObject of PrototypeUtil.getInjectObjects(clazz) || []) {
        const propertyQualifiers = QualifierUtil.getProperQualifiers(clazz, injectObject.refName);
        const hasEggQualifier = propertyQualifiers.find(t => t.attribute === EggQualifierAttribute);
        if (hasEggQualifier) {
          continue;
        }
        if (this.isCtxObject(injectObject.objName)) {
          QualifierUtil.addProperQualifier(clazz, injectObject.refName, EggQualifierAttribute, EggType.CONTEXT);
        } else if (this.isAppObject(injectObject.objName)) {
          QualifierUtil.addProperQualifier(clazz, injectObject.refName, EggQualifierAttribute, EggType.APP);
        }
      }
    }
  }

  private isAppObject(name: PropertyKey) {
    if (APP_CLAZZ_BLACK_LIST.includes(String(name))) {
      return false;
    }
    if (DEFAULT_APP_CLAZZ.includes(String(name))) {
      return true;
    }
    return this.app.hasOwnProperty(name);
  }

  private isCtxObject(name: PropertyKey) {
    if (DEFAULT_CONTEXT_CLAZZ.includes(String(name))) {
      return true;
    }
    return this.app.context.hasOwnProperty(name);
  }
}
