import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { Type, Static } from '@eggjs/tegg/ajv';
import 'egg';
import '@eggjs/tegg-plugin/typings';
import '@eggjs/tegg-controller-plugin/typings';

export const McpClientConfigSchema = Type.Object({
  clients: Type.Record(Type.String(), Type.Object({
    url: Type.Optional(Type.String({
      description: 'mcp server url',
    })),
    clientName: Type.Optional(Type.String({
      description: 'mcp client 名',
    })),
    version: Type.Optional(Type.String({
      description: '客户端版本, 默认值是 1.0.0',
    })),
    transportType: Type.Optional(Type.String({
      description: 'SSE 或者 STREAMABLE_HTTP',
    })),
    type: Type.Optional(Type.String({
      description: '客户端类型',
    })),
  })),
}, {
  title: 'MCP 设置',
  name: 'MCP',
});

export type McpClientConfigSchemaType = Static<typeof McpClientConfigSchema>;

declare module '@eggjs/tegg' {
  export type McpClientConfig = {
    mcp?: McpClientConfigSchemaType;
  };

  export interface ModuleConfig extends McpClientConfig {
  }
}
