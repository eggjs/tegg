import Base from 'sdk-base';
import { Application, Context } from 'egg';
import {
  EggLoadUnitType,
  LoadUnit,
  LoadUnitFactory,
} from '@eggjs/tegg-metadata';
import { LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggModuleLoader } from './EggModuleLoader';
import { CompatibleUtil } from './CompatibleUtil';
import { COMPATIBLE_PROTO_IMPLE_TYPE, EggCompatibleProtoImpl } from './EggCompatibleProtoImpl';

export class ModuleHandler extends Base {
  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];

  private readonly loadUnitLoader: EggModuleLoader;
  private readonly app: Application;

  constructor(app: Application) {
    super();
    this.app = app;
    this.loadUnitLoader = new EggModuleLoader(this.app);
  }

  async init() {
    try {
      this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
        COMPATIBLE_PROTO_IMPLE_TYPE, EggCompatibleProtoImpl.create);

      await this.loadUnitLoader.load();
      const instances: LoadUnitInstance[] = [];
      // TODO fixtures dts broken the module defintion
      (this.app as any).module = {};

      for (const loadUnit of this.loadUnits) {
        const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
        if (instance.loadUnit.type !== EggLoadUnitType.APP) {
          CompatibleUtil.appCompatible(this.app, instance);
        }
        instances.push(instance);
      }
      CompatibleUtil.contextModuleCompatible((this.app as any).context as Context, instances);
      this.loadUnitInstances = instances;
      this.ready(true);
    } catch (e) {
      this.ready(e);
      throw e;
    }

  }

  async destroy() {
    if (this.loadUnitInstances) {
      for (const instance of this.loadUnitInstances) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of this.loadUnits) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
  }
}
