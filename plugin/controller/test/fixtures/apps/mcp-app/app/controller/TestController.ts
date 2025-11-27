import {
  MCPController,
  PromptArgs,
  ToolArgs,
  MCPPromptResponse,
  MCPToolResponse,
  MCPResourceResponse,
  MCPPrompt,
  MCPTool,
  MCPResource,
  PromptArgsSchema,
  Logger,
  Inject,
  ContextProto,
  ToolArgsSchema,
  Extra,
  ToolExtra,
} from '@eggjs/tegg';
import * as z from 'zod/v4';

export const PromptType = {
  name: z.string(),
};

export const ToolType = {
  name: z.string().describe('npm package name'),
};

@ContextProto()
export class TestCommonService {
  @Inject()
  logger: Logger;

  async sayHello(): Promise<string> {
    this.logger.info('hello world');
    return 'hello world';
  }
}

@MCPController({
  name: 'test',
})
export class TestMcpController {

  @Inject()
  logger: Logger;

  @Inject()
  testCommonService: TestCommonService;

  @Inject()
  user: any;

  @MCPPrompt()
  async testFoo(@PromptArgsSchema(PromptType) args: PromptArgs<typeof PromptType>): Promise<MCPPromptResponse> {
    this.logger.info('hello world');
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a concise but descriptive commit message for these changes:\n\n${args.name}`,
          },
        },
      ],
    };
  }

  @MCPTool()
  async testBar(@ToolArgsSchema(ToolType) args: ToolArgs<typeof ToolType>): Promise<MCPToolResponse> {
    await this.testCommonService.sayHello();
    return {
      content: [
        {
          type: 'text',
          text: `npm package: ${args.name} not found`,
        },
      ],
    };
  }

  @MCPTool()
  async testEchoUser(): Promise<MCPToolResponse> {
    return {
      content: [
        {
          type: 'text',
          text: `hello ${this.user}`,
        },
      ],
    };
  }

  @MCPTool()
  async testTraceTest(@Extra() extra: ToolExtra): Promise<MCPToolResponse> {
    return {
      content: [
        {
          type: 'text',
          text: `hello ${extra.requestInfo?.headers.trace}`,
        },
      ],
    };
  }


  @MCPResource({
    template: [
      'mcp://npm/{name}{?version}',
      {
        list: () => {
          return {
            resources: [
              { name: 'testEgg', uri: 'mcp://npm/testEgg?version=4.10.0' },
              { name: 'testMcp', uri: 'mcp://npm/testMcp?version=0.10.0' },
            ],
          };
        },
      },
    ],
  })
  async testCar(uri: URL): Promise<MCPResourceResponse> {
    return {
      contents: [{
        uri: uri.toString(),
        text: 'MOCK TEXT',
      }],
    };
  }
}
