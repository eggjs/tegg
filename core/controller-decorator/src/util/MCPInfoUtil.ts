import { CONTROLLER_MCP_NAME, CONTROLLER_MCP_PROMPT_MAP, CONTROLLER_MCP_RESOURCE_MAP, CONTROLLER_MCP_RESOURCE_PARAMS_MAP, CONTROLLER_MCP_TOOL_MAP, CONTROLLER_MCP_TOOL_PARAMS_MAP, CONTROLLER_MCP_VERSION, MCPPromptParams, MCPResourceParams, MCPToolParams } from '@eggjs/tegg-types';
import { EggProtoImplClass, MetadataUtil } from '@eggjs/tegg';

type MCPMethodMap = Map<string, boolean>;
type MCPResourceMap = Map<string, MCPResourceParams>;
type MCPToolMap = Map<string, MCPToolParams>;
type MCPPromptMap = Map<string, MCPPromptParams>;

export default class MCPInfoUtil {

  static setMCPName(name: string, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_MCP_NAME, name, clazz);
  }

  static getMCPName(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_MCP_NAME, clazz);
  }

  static setMCPVersion(version: string, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_MCP_VERSION, version, clazz);
  }

  static getMCPVersion(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_MCP_VERSION, clazz);
  }

  static setMCPResource(clazz: EggProtoImplClass, methodName: string) {
    const methodMap: MCPMethodMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_RESOURCE_MAP, clazz, new Map());
    methodMap.set(methodName, true);
  }

  static getMCPResource(clazz: EggProtoImplClass): string[] {
    const methodMap: MCPMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_RESOURCE_MAP, clazz);
    if (!methodMap) {
      return [];
    }
    return Array.from(methodMap.keys());
  }

  static setMCPResourceParams(params: MCPResourceParams & { mcpName?: string }, clazz: EggProtoImplClass, resourceName: string) {
    const methodMap: MCPResourceMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_RESOURCE_PARAMS_MAP, clazz, new Map());
    methodMap.set(resourceName, params);
  }

  static getMCPResourceParams(clazz: EggProtoImplClass, resourceName: string): MCPResourceParams & { mcpName?: string } | undefined {
    const methodMap: MCPResourceMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_RESOURCE_PARAMS_MAP, clazz);
    return methodMap?.get(resourceName);
  }

  static setMCPTool(clazz: EggProtoImplClass, methodName: string) {
    const methodMap: MCPMethodMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_TOOL_MAP, clazz, new Map());
    methodMap.set(methodName, true);
  }

  static getMCPTool(clazz: EggProtoImplClass): string[] {
    const methodMap: MCPMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_TOOL_MAP, clazz);
    if (!methodMap) {
      return [];
    }
    return Array.from(methodMap.keys());
  }

  static getMCPToolParams(clazz: EggProtoImplClass, resourceName: string): MCPToolParams & { mcpName?: string } | undefined {
    const methodMap: MCPToolMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_TOOL_PARAMS_MAP, clazz);
    return methodMap?.get(resourceName);
  }

  static setMCPToolParams(params: MCPToolParams & { mcpName?: string }, clazz: EggProtoImplClass, resourceName: string) {
    const methodMap: MCPToolMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_TOOL_PARAMS_MAP, clazz, new Map());
    methodMap.set(resourceName, params);
  }

  static setMCPPrompt(clazz: EggProtoImplClass, methodName: string) {
    const methodMap: MCPMethodMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_PROMPT_MAP, clazz, new Map());
    methodMap.set(methodName, true);
  }

  static getMCPPrompt(clazz: EggProtoImplClass): string[] {
    const methodMap: MCPMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_PROMPT_MAP, clazz);
    if (!methodMap) {
      return [];
    }
    return Array.from(methodMap.keys());
  }

  static setMCPPromptParams(params: MCPPromptParams & { mcpName?: string }, clazz: EggProtoImplClass, resourceName: string) {
    const methodMap: MCPPromptMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_RESOURCE_PARAMS_MAP, clazz, new Map());
    methodMap.set(resourceName, params);
  }

  static getMCPPromptParams(clazz: EggProtoImplClass, resourceName: string): MCPPromptParams & { mcpName?: string } | undefined {
    const methodMap: MCPPromptMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_RESOURCE_PARAMS_MAP, clazz);
    return methodMap?.get(resourceName);
  }

}
