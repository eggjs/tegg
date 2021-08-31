import { EggContainerFactory, EggContext, LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggLoadUnitType, EggPrototype, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
export class CoreTestHelper {
  static async getLoadUnitInstance(moduleDir: string): Promise<LoadUnitInstance> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(moduleDir, EggLoadUnitType.MODULE, loader);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }
  static async prepareModules(moduleDirs: string[]): Promise<Array<LoadUnitInstance>> {
    const instances: Array<LoadUnitInstance> = [];
    for (const moduleDir of moduleDirs) {
      instances.push(await CoreTestHelper.getLoadUnitInstance(moduleDir));
    }
    return instances;
  }
  static async getObject<T>(clazz: EggProtoImplClass<T>, ctx?: EggContext): Promise<T> {
    const proto = PrototypeUtil.getClazzProto(clazz as any) as EggPrototype;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(proto, proto.name, ctx);
    return eggObj.obj as unknown as T;
  }
}
