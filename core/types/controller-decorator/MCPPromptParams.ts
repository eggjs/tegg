import type { ZodTypeAny, objectOutputType } from 'zod';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type PromptArgs<T extends Parameters<McpServer['prompt']>['2']> = objectOutputType<T, ZodTypeAny>;
export type PromptExtra = Parameters<Parameters<McpServer['prompt']>['3']>['1'];

export type MCPPromptResponse = GetPromptResult;

export interface MCPPromptParams {
  name?: string;
  description?: string;
  schema?: Parameters<McpServer['prompt']>['2'];
}
