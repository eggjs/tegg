import { MCPPromptResponse, MCPResourceResponse, MCPToolResponse, PromptArgs, ToolArgs } from "@eggjs/tegg-types";
import { MCPPrompt } from "../../src/decorator/mcp/MCPPrompt";
import { MCPTool } from "../../src/decorator/mcp/MCPTool";
import { MCPController } from "../../src/decorator/mcp/MCPController";
import z from 'zod';
import { MCPResource } from "../../src/decorator/mcp/MCPResource";

export const PromptType = {
  name: z.string(),
}

export const ToolType = {
  name: z.string({
    description: 'npm package name',
  }),
}

@MCPController({
  name: "HelloChairMCP",
})
export class MCPFooController {

  @MCPPrompt({
    schema: PromptType,
  })
  async foo(args: PromptArgs<typeof PromptType>): Promise<MCPPromptResponse> {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a concise but descriptive commit message for these changes:\n\n${args.name}`,
          },
        },
      ],
    };
  }

  @MCPTool({
    schema: ToolType,
  })
  async bar(args: ToolArgs<typeof ToolType>): Promise<MCPToolResponse> {
    return {
      content: [
        {
          type: 'text',
          text: `海兔 npm 包: ${args.name} 不存在`,
        },
      ],
    };
  }


  @MCPResource({
    template: [
      "hitu://npm/{name}",
      {
        list: undefined,
      },
    ],
  })
  async car(uri: URL): Promise<MCPResourceResponse> {
    return {
      contents: [{
        uri: uri.toString(),
        text: `MOCK TEXT`,
      }],
    };
  }
}

