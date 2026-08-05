import { Context, MCPController, MCPTool, MCPToolResponse, ToolArgsSchema, ToolArgs, Middleware } from '@eggjs/tegg';
import * as z from 'zod/v4';
import { McpTestAdvice } from './McpTestAdvice';
import type { ServiceWorkerFetchContext } from '../../../src/http/ServiceWorkerFetchContext';

const EchoArgs = {
  message: z.string().describe('The message to echo'),
};

const AddArgs = {
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
};

const AddOutput = {
  result: z.number(),
};

@Middleware(McpTestAdvice)
@MCPController({ name: 'test-server', version: '1.0.0' })
export class MCPTestController {
  @MCPTool({
    description: 'Echo the input message',
    meta: {
      ui: {
        resourceUri: 'ui://test/echo',
        visibility: [ 'model' ],
      },
    },
  })
  async echo(@ToolArgsSchema(EchoArgs) args: ToolArgs<typeof EchoArgs>): Promise<MCPToolResponse> {
    return {
      content: [{ type: 'text', text: args.message }],
    };
  }

  @MCPTool({ description: 'Add two numbers', outputSchema: AddOutput })
  async add(@ToolArgsSchema(AddArgs) args: ToolArgs<typeof AddArgs>, @Context() ctx: ServiceWorkerFetchContext): Promise<MCPToolResponse<typeof AddOutput>> {
    if (!ctx?.event?.request) {
      throw new Error('ctx is required');
    }
    const result = args.a + args.b;
    return {
      content: [{ type: 'text', text: String(result) }],
      structuredContent: { result },
    };
  }
}
