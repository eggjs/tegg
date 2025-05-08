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
  ToolArgsSchema,
} from '@eggjs/tegg';
import z from 'zod';

export const PromptType = {
  name: z.string(),
};

export const ToolType = {
  name: z.string({
    description: 'npm package name',
  }),
};


@MCPController()
export class McpController {

  @Inject()
  logger: Logger;

  @MCPPrompt()
  async foo(@PromptArgsSchema(PromptType) args: PromptArgs<typeof PromptType>): Promise<MCPPromptResponse> {
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
  async bar(@ToolArgsSchema(ToolType) args: ToolArgs<typeof ToolType>): Promise<MCPToolResponse> {
    return {
      content: [
        {
          type: 'text',
          text: `npm package: ${args.name} not found`,
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
              { name: 'egg', uri: 'mcp://npm/egg?version=4.10.0' },
              { name: 'mcp', uri: 'mcp://npm/mcp?version=0.10.0' },
            ],
          };
        },
      },
    ],
  })
  async car(uri: URL): Promise<MCPResourceResponse> {
    return {
      contents: [{
        uri: uri.toString(),
        text: 'MOCK TEXT',
      }],
    };
  }
}
