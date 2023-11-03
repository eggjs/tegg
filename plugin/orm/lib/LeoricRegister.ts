import Base from 'sdk-base';
import { ModelProtoManager } from './ModelProtoManager';
import { DataSourceManager, OrmConfig } from './DataSourceManager';
import Realm from 'leoric';
import { hookNames } from 'leoric/lib/setup_hooks';
import { ModelMetadata, ModelMetadataUtil } from '@eggjs/tegg-orm-decorator';

export class LeoricRegister extends Base {
  private readonly modelProtoManager: ModelProtoManager;
  private readonly dataSourceManager: DataSourceManager;
  readonly realmMap: Map<string, any>;

  constructor(modelProtoManager: ModelProtoManager, dataSourceManager: DataSourceManager) {
    super();
    this.modelProtoManager = modelProtoManager;
    this.dataSourceManager = dataSourceManager;
    this.realmMap = new Map();
  }

  getConfig(datasource?: string) {
    let config: OrmConfig | undefined;
    if (!datasource) {
      config = this.dataSourceManager.getDefaultConfig();
    } else {
      config = this.dataSourceManager.getConfig(datasource);
    }
    return config;
  }

  getRealm(config: OrmConfig | undefined): Realm | undefined {
    if (!config?.database) {
      return undefined;
    }
    const realm = this.realmMap.get(config.database);
    return realm;
  }

  getOrCreateRealm(datasource: string | undefined): any {
    const config = this.getConfig(datasource);
    let realm: Realm | undefined;
    if (config) {
      realm = this.getRealm(config);
      if (realm) {
        return realm;
      }
    }
    realm = new (Realm as any)({ ...config });
    this.realmMap.set(config!.database, realm);
    return realm;
  }

  generateLeoricAttributes(metadata: ModelMetadata) {
    const attributes = {};
    for (const attribute of metadata.attributes) {
      attributes[attribute.propertyName] = {
        columnName: attribute.attributeName,
        type: attribute.dataType,
        allowNull: attribute.allowNull,
        primaryKey: attribute.primary,
        unique: attribute.unique,
        autoIncrement: attribute.autoIncrement,
      };
    }
    return attributes;
  }

  async register() {
    for (const { proto, clazz } of this.modelProtoManager.getProtos()) {
      const metadata = ModelMetadataUtil.getModelMetadata(clazz);
      if (!metadata) throw new Error(`not found metadata for model ${proto.id}`);
      const realm = this.getOrCreateRealm(metadata.dataSource);
      realm.models[clazz.name] = clazz;
      realm[clazz.name] = clazz;
      const attributes = this.generateLeoricAttributes(metadata);
      const hooks = {};
      for (const hookName of hookNames) {
        if (clazz[hookName]) {
          hooks[hookName] = clazz[hookName];
        }
      }

      (clazz as any).init(attributes, {
        tableName: metadata.tableName,
        hooks,
      }, {});
    }
    await Promise.all(Array.from(this.realmMap.values())
      .map(realm => realm.connect()));
    this.ready(true);
  }
}
