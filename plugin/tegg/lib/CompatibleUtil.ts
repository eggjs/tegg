import { Application, Context } from 'egg';
import { EggPrototype, EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { InitTypeQualifierAttribute, ObjectInitType } from '@eggjs/tegg';
import { EggContainerFactory, LoadUnitInstance } from '@eggjs/tegg-runtime';
import { ProxyUtil } from '@eggjs/tegg-common-util';

export class CompatibleUtil {
  static singletonProtoCache: Map<PropertyKey, EggPrototype> = new Map();
  static requestProtoCache: Map<PropertyKey, EggPrototype> = new Map();

  static getSingletonProto(name: PropertyKey): EggPrototype {
    if (!this.singletonProtoCache.has(name)) {
      const proto = EggPrototypeFactory.instance.getPrototype(name, undefined, [{
        attribute: InitTypeQualifierAttribute,
        value: ObjectInitType.SINGLETON,
      }]);
      this.singletonProtoCache.set(name, proto);
    }
    return this.singletonProtoCache.get(name)!;
  }

  static getRequestProto(name: PropertyKey): EggPrototype {
    if (!this.requestProtoCache.has(name)) {
      const proto = EggPrototypeFactory.instance.getPrototype(name, undefined, [{
        attribute: InitTypeQualifierAttribute,
        value: ObjectInitType.CONTEXT,
      }]);
      this.requestProtoCache.set(name, proto);
    }
    return this.requestProtoCache.get(name)!;
  }

  private static singletonModuleProxyFactory(app: Application, loadUnitInstance: LoadUnitInstance, deprecate: boolean) {
    return function(_, p: PropertyKey) {
      const proto = CompatibleUtil.getSingletonProto(p);
      const eggObj = EggContainerFactory.getEggObject(proto);
      if (deprecate) {
        app.deprecate(
          `[egg/module] Please use app.module.${loadUnitInstance.name}.${String(p)} instead of app.${loadUnitInstance.name}.${String(p)}`);
      }
      return eggObj.obj;
    };
  }

  static appCompatible(app: Application, loadUnitInstance: LoadUnitInstance) {
    const moduleLoadUnitProxy = ProxyUtil.safeProxy(loadUnitInstance, CompatibleUtil.singletonModuleProxyFactory(app, loadUnitInstance, false));
    Reflect.defineProperty(app.module, loadUnitInstance.name, {
      configurable: true,
      value: moduleLoadUnitProxy,
    });
  }

  static contextModuleProxyFactory(holder: object, ctx: Context, loadUnitInstance: LoadUnitInstance, deprecate: boolean) {
    const cacheKey = `_${loadUnitInstance.name}Proxy`;
    if (!holder[cacheKey]) {
      const getter = function(_, p: PropertyKey) {
        const proto = CompatibleUtil.getRequestProto(p);
        const eggObj = EggContainerFactory.getEggObject(proto, p);
        if (deprecate) {
          ctx.app.deprecate(
            `[egg/module] Please use ctx.module.${loadUnitInstance.name}.${String(p)} instead of ctx.${loadUnitInstance.name}.${String(p)}`);
        }
        return eggObj.obj;
      };
      holder[cacheKey] = ProxyUtil.safeProxy(loadUnitInstance, getter);
    }
    return holder[cacheKey];
  }

  static contextModuleCompatible(context: Context, loadUnitInstances: LoadUnitInstance[]) {
    const loadUnitInstanceMap: Record<PropertyKey, LoadUnitInstance> = loadUnitInstances.reduce((p, c) => {
      p[c.name] = c;
      return p;
    }, {});

    Reflect.defineProperty(context, 'module', {
      configurable: true,
      enumerable: true,
      get(this: Context): any {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx: Context = this;
        if (!this._moduleProxy) {
          const ctxModule = Object.create(loadUnitInstanceMap);
          this._moduleProxy = ProxyUtil.safeProxy(ctxModule, (_, p: PropertyKey) => {
            const loadUnitInstance = Reflect.get(ctxModule, p);
            if (!loadUnitInstance) {
              return;
            }
            return CompatibleUtil.contextModuleProxyFactory(ctxModule, ctx, loadUnitInstance, false);
          });
        }
        return this._moduleProxy;
      },
    });
  }

  static clean() {
    this.singletonProtoCache.clear();
    this.requestProtoCache.clear();
  }
}
