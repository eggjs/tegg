import { Application } from 'egg';
import { DataSourceManager } from './lib/DataSourceManager';
import { LeoricRegister } from './lib/LeoricRegister';
import { ModelProtoManager } from './lib/ModelProtoManager';
import { ModelProtoHook } from './lib/ModelProtoHook';
import { MODEL_PROTO_IMPL_TYPE } from '@eggjs/tegg-orm-decorator';
import ContextModelProto from './lib/ContextModelProto';
import { ContextModeObject } from './lib/ContextModeObject';

export default class OrmAppBootHook {
  private readonly app: Application;
  private readonly dataSourceManager: DataSourceManager;
  private readonly leoricRegister: LeoricRegister;
  private readonly modelProtoManager: ModelProtoManager;
  private readonly modelProtoHook: ModelProtoHook;

  constructor(app) {
    this.app = app;
    this.dataSourceManager = new DataSourceManager();
    this.modelProtoManager = new ModelProtoManager();
    this.leoricRegister = new LeoricRegister(this.modelProtoManager, this.dataSourceManager);
    this.modelProtoHook = new ModelProtoHook(this.modelProtoManager);
    this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(MODEL_PROTO_IMPL_TYPE, ContextModelProto.createProto);
    this.app.leoricRegister = this.leoricRegister;
  }

  configWillLoad() {
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.modelProtoHook);
    this.app.eggObjectFactory.registerEggObjectCreateMethod(ContextModelProto, ContextModeObject.createObject);
  }

  configDidLoad() {
    const config = this.app.config.orm;
    if (config.datasources) {
      for (const datasource of config.datasources) {
        this.dataSourceManager.addConfig(datasource);
      }
    } else {
      this.dataSourceManager.addDefaultConfig(config);
    }
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
    await this.leoricRegister.register();
  }

  async beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.modelProtoHook);
  }
}
