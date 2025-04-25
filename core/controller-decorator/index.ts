import './src/impl/http/HTTPControllerMetaBuilder';
import './src/impl/mcp/MCPControllerMetaBuilder';

export * from '@eggjs/tegg-types/controller-decorator';
export * from './src/model';
export * from './src/decorator/Context';
export * from './src/decorator/Middleware';
export * from './src/decorator/Acl';
export * from './src/decorator/http/HTTPController';
export * from './src/decorator/http/HTTPMethod';
export * from './src/decorator/http/HTTPParam';
export * from './src/decorator/http/Host';
export * from './src/decorator/mcp/MCPController';
export * from './src/decorator/mcp/MCPPrompt';
export * from './src/decorator/mcp/MCPResource';
export * from './src/decorator/mcp/MCPTool';
export * from './src/builder/ControllerMetaBuilderFactory';
export * from './src/util/ControllerMetadataUtil';
export { default as MCPInfoUtil } from './src/util/MCPInfoUtil';
export * from './src/util/HTTPPriorityUtil';

export { default as ControllerInfoUtil } from './src/util/ControllerInfoUtil';
