import { MCPPromptResponse, MCPResourceResponse, MCPToolResponse, PromptArgs, ToolArgs } from "@eggjs/tegg-types";
import { MCPPrompt, PromptArgsSchema } from "../../src/decorator/mcp/MCPPrompt";
import { MCPTool, ToolArgsSchema } from "../../src/decorator/mcp/MCPTool";
import { MCPController } from "../../src/decorator/mcp/MCPController";
import * as z from 'zod/v4';
import { MCPResource } from "../../src/decorator/mcp/MCPResource";
import { Extra } from "../../src/decorator/mcp/Extra";

export const PromptType = {
  name: z.string(),
}

export const ToolType = {
  name: z.string().describe('npm package name'),
}

@MCPController({
  name: "HelloChairMCP",
  timeout: 60000,
})
export class MCPFooController {
  @MCPPrompt()
  async foo(@PromptArgsSchema(PromptType) args: PromptArgs<typeof PromptType>): Promise<MCPPromptResponse> {
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

  @MCPTool()
  async bar(@ToolArgsSchema(ToolType) args: ToolArgs<typeof ToolType>): Promise<MCPToolResponse> {
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
  async car(uri: URL, @Extra() extra): Promise<MCPResourceResponse> {
    console.log(extra);
    return {
      contents: [{
        uri: uri.toString(),
        text: `MOCK TEXT`,
      }],
    };
  }
}

