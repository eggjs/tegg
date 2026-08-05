import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ShapeOutput, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';

export type ToolArgs<T extends Parameters<McpServer['tool']>['2']> = ShapeOutput<T>;
export type ToolExtra = Parameters<Parameters<McpServer['tool']>['4']>['1'];

export type ToolOutputSchema = ZodRawShapeCompat;

export type MCPToolSuccessResponse<OutputSchema extends ToolOutputSchema> =
  Omit<CallToolResult, 'isError' | 'structuredContent'> & {
    isError?: false;
    structuredContent: ShapeOutput<OutputSchema>;
  };

export type MCPToolErrorResponse = Omit<CallToolResult, 'isError'> & {
  isError: true;
};

export type MCPToolResponse<OutputSchema extends ToolOutputSchema | undefined = undefined> =
  [OutputSchema] extends [ToolOutputSchema]
    ? MCPToolSuccessResponse<Extract<OutputSchema, ToolOutputSchema>> | MCPToolErrorResponse
    : CallToolResult;

export type MCPToolVisibility = 'model' | 'app';

export interface MCPToolUIMeta {
  resourceUri?: string;
  visibility?: MCPToolVisibility[];
}

export type MCPToolRegistrationMeta = {
  ui: MCPToolUIMeta;
};

export interface MCPToolParams {
  name?: string;
  description?: string;
  timeout?: number;
  meta?: MCPToolRegistrationMeta;
  outputSchema?: ToolOutputSchema;
}
