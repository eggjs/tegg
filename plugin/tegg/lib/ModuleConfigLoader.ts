import {
  AccessLevel,
  EggProtoImplClass,
  EggQualifierAttribute,
  EggType,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute, ModuleConfigs,
  ObjectInitType,
  PrototypeUtil,
  QualifierUtil,
  ModuleConfigHolder, ConfigSourceQualifierAttribute,
} from '@eggjs/tegg';
import { ModuleConfigUtil } from '@eggjs/tegg/helper';
import { COMPATIBLE_PROTO_IMPLE_TYPE } from './EggCompatibleProtoImpl';
import { Application } from 'egg';

export class ModuleConfigLoader {
  constructor(readonly app: Application) {
  }

  private loadModuleConfigs(moduleConfigMap: Record<string, ModuleConfigHolder>): EggProtoImplClass {
    const moduleConfigs = new ModuleConfigs(moduleConfigMap);
    const func: EggProtoImplClass = function() {
      return moduleConfigs;
    } as any;
    const name = 'moduleConfigs';
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

  loadModuleConfigList(): EggProtoImplClass[] {
    const result: EggProtoImplClass[] = [];
    const moduleConfigMap: Record<string, ModuleConfigHolder> = {};
    for (const reference of this.app.moduleReferences) {
      const moduleName = ModuleConfigUtil.readModuleNameSync(reference.path);
      // first read @eggjs/tegg-config moduleConfigs
      const config = this.app.moduleConfigs[moduleName].config || ModuleConfigUtil.loadModuleConfigSync(reference.path, undefined, this.app.config.env) || {};
      moduleConfigMap[moduleName] = {
        name: moduleName,
        reference: {
          name: moduleName,
          path: reference.path,
        },
        config,
      };

      const func: EggProtoImplClass = function() {
        return config;
      } as any;
      const name = 'moduleConfig';
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
      QualifierUtil.addProtoQualifier(func, ConfigSourceQualifierAttribute, moduleName);
      result.push(func);
    }
    const moduleConfigs = this.loadModuleConfigs(moduleConfigMap);
    result.push(moduleConfigs);
    return result;
  }
}
