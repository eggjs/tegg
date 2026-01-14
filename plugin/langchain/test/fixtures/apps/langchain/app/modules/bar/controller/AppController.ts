import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Inject,
} from '@eggjs/tegg';
import { ChatModelQualifier, TeggBoundModel, TeggCompiledStateGraph } from '@eggjs/tegg-langchain-decorator';
import { ChatOpenAIModel } from '../../../../../../../../lib/ChatOpenAI';
import { BoundChatModel } from '../service/BoundChatModel';
import { FooGraph } from '../service/Graph';
import { AIMessage } from 'langchain';

@HTTPController({
  path: '/llm',
})
export class AppController {
  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAIModel;

  @Inject()
  boundChatModel: TeggBoundModel<BoundChatModel>;

  @Inject()
  compiledFooGraph: TeggCompiledStateGraph<FooGraph>;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello() {
    const res = await this.chatModel.invoke('hello');
    return res;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/bound-chat',
  })
  async boundChat() {
    const res = await this.boundChatModel.invoke('hello');
    return res;
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/graph' })
  async get() {
    const res = await this.compiledFooGraph.invoke({
      messages: [],
      aggregate: [],
    }, {
      configurable: {
        thread_id: '1',
      },
      tags: [ 'trace-log' ],
    });

    return {
      value: res.messages.filter(msg => AIMessage.prototype.isPrototypeOf(msg)).reduce((pre, cur) => {
        return cur.content + pre;
      }, ''),
    };
  }
}
