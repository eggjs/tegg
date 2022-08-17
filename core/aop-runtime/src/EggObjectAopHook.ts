import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg-runtime';
import { Aspect, ASPECT_LIST } from '@eggjs/aop-decorator';
import { AspectExecutor } from './AspectExecutor';

export class EggObjectAopHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  private hijackMethods(obj: any, aspectList: Array<Aspect>) {
    for (const aspect of aspectList) {
      const newExecutor = new AspectExecutor(obj, aspect.method, aspect.adviceList);
      obj[aspect.method] = newExecutor.execute.bind(newExecutor);
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
          }
          return obj;
        },
      });
    } else {
      this.hijackMethods(eggObject.obj, aspectList);
    }
  }
}
