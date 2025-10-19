import { ChatOpenAI } from '@langchain/openai';
import {
  ChatModelQualifier,
} from '../../../../src';
import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo {
  @Inject()
  @ChatModelQualifier('chat')
  chatModel: ChatOpenAI;
}
