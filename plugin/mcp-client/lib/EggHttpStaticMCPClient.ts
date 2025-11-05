import {
  AccessLevel,
  Inject,
  Logger,
  ModuleConfig,
  LifecycleInit,
  MultiInstanceProto,
  ObjectInitType,
  MultiInstancePrototypeGetObjectsContext,
  MultiInstanceInfo,
  ObjectInfo,
  QualifierInfo,
} from '@eggjs/tegg';
import type { EggApplication } from 'egg';
import { ModuleConfigUtil } from '@eggjs/tegg/helper';
import {
  getMCPClientConfig,
  getMCPClientName,
  MCPClientInjectName,
  MCPClientQualifierAttribute,
} from '@eggjs/mcp-client';
import { QualifierUtil } from './QualifierUtil';
import { EggHttpMCPClient } from './EggHttpMCPClient';
import assert from 'node:assert';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  // 从 module.yml 中动态获取配置来决定需要初始化几个对象
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath) as ModuleConfig | undefined;
    const moduleName = ModuleConfigUtil.readModuleNameSync(ctx.unitPath);
    const clients = config?.mcp?.clients;
    if (!clients) return [];
    return Object.keys(clients)
      .filter(clientName => {
        return clients[clientName].type === 'http';
      })
      .map((clientName: string) => {
        const properQualifiers: Record<PropertyKey, QualifierInfo[]> = {
          ...QualifierUtil.getModuleConfigQualifier(moduleName),
        };
        return {
          name: MCPClientInjectName,
          qualifiers: [{
            attribute: MCPClientQualifierAttribute,
            value: clientName,
          }],
          properQualifiers,
        };
      });
  },
})
export class EggVipStaticMCPClient extends EggHttpMCPClient {
  constructor(
    @Inject() moduleConfig: ModuleConfig,
    @Inject() logger: Logger,
    @Inject() FetchFactory: EggApplication['FetchFactory'],
    @MultiInstanceInfo([ MCPClientQualifierAttribute ]) objInfo: ObjectInfo,
  ) {
    const configName = getMCPClientName(objInfo);
    const sseClientConfig = getMCPClientConfig(moduleConfig, objInfo);
    const clientName = sseClientConfig.clientName ?? configName;
    const mcpServerSubConfig = {
      ...sseClientConfig,
    };

    assert(mcpServerSubConfig.url, `not found mcpServerSubConfig.url for ${clientName}`);

    super({
      clientName,
      clientVersion: sseClientConfig.version ?? '1.0.0',
      transportType: mcpServerSubConfig.transportType as any,
      url: mcpServerSubConfig.url,
      logger,
      fetch: FetchFactory.fetch,
    });
  }

  @LifecycleInit()
  async _init() {
    await super.init();
  }
}
