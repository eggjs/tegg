import {
  AccessLevel,
  Inject,
  MultiInstanceInfo,
  MultiInstanceProto,
  MultiInstancePrototypeGetObjectsContext,
  ObjectInfo,
  ObjectInitType,
  ModuleConfig,
} from '@eggjs/tegg';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { ChatOpenAI } from '@langchain/openai';
import { getChatModelConfig, getClientNames } from './util';
import { QualifierUtil } from './config/QualifierUtil';
import { fetch, FetchFactory, Agent } from 'urllib';
import { ChatModelInjectName, ChatModelQualifierAttribute } from '@eggjs/tegg-langchain-decorator';
import { ChatModelHelper } from './ChatModelHelper';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  // 从 module.yml 中动态获取配置来决定需要初始化几个对象
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config: ModuleConfig = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath);
    const moduleName = ModuleConfigUtil.readModuleNameSync(ctx.unitPath);
    return getClientNames(config, 'ChatModel')
      .map(name => {
        return {
          name: ChatModelInjectName,
          qualifiers: ChatModelHelper.getChatModelQualifier(name)[ChatModelInjectName],
          properQualifiers: {
            ...QualifierUtil.getModuleConfigQualifier(moduleName),
          },
        };
      });
  },
})
export class ChatOpenAIModel extends ChatOpenAI {
  constructor(
    @Inject() readonly moduleConfig: ModuleConfig,
    @MultiInstanceInfo([ ChatModelQualifierAttribute ]) objInfo: ObjectInfo,
  ) {
    const chatConfig = getChatModelConfig(moduleConfig, objInfo);
    chatConfig.configuration = chatConfig.configuration || {};
    // 如果依赖中存在低版本 urllib 会引发问题，因此需要手动设置好
    FetchFactory.setDispatcher(new Agent({ allowH2: true }));
    (chatConfig.configuration as any).fetch = fetch as any;
    super(chatConfig as any);
  }
}
