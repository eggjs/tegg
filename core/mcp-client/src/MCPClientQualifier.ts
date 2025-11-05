import { QualifierUtil, EggProtoImplClass, ModuleConfig, ObjectInfo } from '@eggjs/tegg';
import assert from 'node:assert';

export const MCPClientQualifierAttribute = Symbol.for('Qualifier.MCP_CLIENT');
export const MCPClientInjectName = 'mcpClient';

export function MCPClientQualifier(mcpClientName: string) {
  return function(target: any, propertyKey: PropertyKey) {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass,
      propertyKey, MCPClientQualifierAttribute, mcpClientName);
  };
}

export type MCPConfigType =
  Required<ModuleConfig>['mcp']['clients'][keyof Required<ModuleConfig>['mcp']['clients']];

export function getMCPClientName(objectInfo: ObjectInfo): string {
  const mcpClientName = objectInfo.qualifiers.find(t => t.attribute === MCPClientQualifierAttribute)?.value;
  assert(mcpClientName, 'not found mcpClientName name');
  return mcpClientName as string;
}

export function getMCPClientConfig(config: ModuleConfig, objectInfo: ObjectInfo): MCPConfigType {
  const mcpClientName = getMCPClientName(objectInfo);
  const mcpClientConfig = config.mcp?.clients[mcpClientName];
  if (!mcpClientConfig) {
    throw new Error(`not found ChatModel config for ${mcpClientName}`);
  }
  return mcpClientConfig!;
}
