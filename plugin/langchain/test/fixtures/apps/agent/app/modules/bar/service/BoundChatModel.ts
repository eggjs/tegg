import { BoundModel } from '@eggjs/tegg-langchain-decorator';
import { FooTool } from './Graph';

@BoundModel({
  modelName: 'chat',
  tools: [ FooTool ],
})
export class BoundChatModel {}
