import { ModelProtoManager } from './ModelProtoManager';
import { DataSourceManager, OrmConfig } from './DataSourceManager';
import Realm from 'leoric';
import { ModelMetadata, ModelMetadataUtil } from '@eggjs/tegg-orm-decorator';

interface RealmPair {
  models: object[];
  realm: object;
}

export class LeoricRegister {
  private readonly modelProtoManager: ModelProtoManager;
  private readonly dataSourceManager: DataSourceManager;
  private readonly realmMap: Map<string, RealmPair>;

  constructor(modelProtoManager: ModelProtoManager, dataSourceManager: DataSourceManager) {
    this.modelProtoManager = modelProtoManager;
    this.dataSourceManager = dataSourceManager;
    this.realmMap = new Map();
  }

  getOrCreateRealm(datasource: string | undefined): RealmPair {
    let config: OrmConfig | undefined;
    if (!datasource) {
      config = this.dataSourceManager.getDefaultConfig();
    } else {
      config = this.dataSourceManager.getConfig(datasource);
    }
    if (!config) {
      throw new Error(`not found datasource for ${datasource}`);
    }
    let realmPair = this.realmMap.get(config.database);
    if (realmPair) {
      return realmPair;
    }
    const models = [];
    const realm = new (Realm as any)({ ...config, models });
    realmPair = {
      realm,
      models,
    };
    this.realmMap.set(config.database, realmPair);
    return realmPair;
  }

  generateLeoricAttributes(metadata: ModelMetadata) {
    const attributes = {};
    for (const attribute of metadata.attributes) {
      attributes[attribute.propertyName] = {
        columnName: attribute.attributeName,
        dataType: attribute.propertyName,
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
      const metadata = ModelMetadataUtil.getControllerMetadata(clazz);
      if (!metadata) throw new Error(`not found metadata for model ${proto.id}`);
      const { realm, models } = this.getOrCreateRealm(metadata.dataSource);
      models.push(clazz);
      realm[clazz.name] = clazz;
      const attributes = this.generateLeoricAttributes(metadata);
      (clazz as any).init(attributes, {
        tableName: metadata.tableName,
      }, {});
    }
    await Promise.all(Array.from(this.realmMap.values())
      .map(({ realm }) => (realm as any).connect()));
  }
}
