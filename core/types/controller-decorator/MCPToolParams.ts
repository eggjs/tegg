import type { ZodTypeAny, objectOutputType } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type ToolArgs<T extends Parameters<McpServer['tool']>['2']> = objectOutputType<T, ZodTypeAny>;
export type ToolExtra = Parameters<Parameters<McpServer['tool']>['4']>['1'];

export type MCPToolResponse = CallToolResult;

export interface MCPToolParams {
  name?: string;
  description?: string;
}

