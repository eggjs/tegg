import { ASPECT_LIST, InjectType } from '@eggjs/tegg-types';
import type { EggObject, EggObjectLifeCycleContext, LifecycleHook } from '@eggjs/tegg-types';
import { Aspect } from '@eggjs/aop-decorator';
import { AspectExecutor } from './AspectExecutor';
import { PrototypeUtil } from '@eggjs/core-decorator';
import assert from 'node:assert';
import { EggContainerFactory } from '@eggjs/tegg-runtime';

export class EggObjectAopHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  private hijackMethods(obj: any, aspectList: Array<Aspect>) {
    for (const aspect of aspectList) {
      const newExecutor = new AspectExecutor(obj, aspect.method, aspect.adviceList);
      obj[aspect.method] = newExecutor.execute.bind(newExecutor);
    }
  }

  // constructor inject only paas obj to constructor
  // should manually define obj to property
  private injectAdvice(eggObject: EggObject, obj: any, aspectList: Array<Aspect>) {
    if (eggObject.proto.getMetaData(PrototypeUtil.INJECT_TYPE) !== InjectType.CONSTRUCTOR) {
      return;
    }
    for (const aspect of aspectList) {
      for (const advice of aspect.adviceList) {
        const injectObject = eggObject.proto.injectObjects.find(t => t.objName === advice.name);
        assert(injectObject, `not found inject advice ${advice.name}`);
        const adviceObj = EggContainerFactory.getEggObject(injectObject!.proto, advice.name);
        Object.defineProperty(obj, advice.name, {
          value: adviceObj.obj,
          enumerable: false,
        });
      }
    }
  }

  async postCreate(_: EggObjectLifeCycleContext, eggObject: EggObject): Promise<void> {
    const aspectList: Array<Aspect> | undefined = eggObject.proto.getMetaData(ASPECT_LIST);
    if (!aspectList || !aspectList.length) return;
    const propertyDesc = eggObject.constructor && Reflect.getOwnPropertyDescriptor(eggObject.constructor.prototype, 'obj')!;
    // process the lazy getter
    if (propertyDesc?.get) {
      let obj;
      const self = this;
      Object.defineProperty(eggObject, 'obj', {
        ...propertyDesc,
        get(): any {
          if (!obj) {
            obj = Reflect.apply(propertyDesc.get!, eggObject, []);
            self.hijackMethods(obj, aspectList);
            self.injectAdvice(eggObject, obj, aspectList);
          }
          return obj;
        },
      });
    } else {
      this.hijackMethods(eggObject.obj, aspectList);
      this.injectAdvice(eggObject, eggObject.obj, aspectList);
    }
  }
}
