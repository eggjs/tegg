import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Inject,
} from '@eggjs/tegg';
import { ChatModelQualifier } from '@eggjs/tegg-langchain-decorator';
import { ChatOpenAIModel } from '../../../../../../../../lib/ChatOpenAI';

@HTTPController({
  path: '/llm',
})
export class AppController {
  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAIModel;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello() {
    const res = await this.chatModel.invoke('hello');
    return res;
  }
}
