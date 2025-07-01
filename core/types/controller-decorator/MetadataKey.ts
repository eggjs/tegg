export const CONTROLLER_TYPE = Symbol.for('EggPrototype#controllerType');
export const CONTROLLER_NAME = Symbol.for('EggPrototype#controllerName');
export const CONTROLLER_HOST = Symbol.for('EggPrototype#controllerHost');
export const CONTROLLER_MIDDLEWARES = Symbol.for('EggPrototype#controller#middlewares');
export const CONTROLLER_AOP_MIDDLEWARES = Symbol.for('EggPrototype#controller#aopMiddlewares');
export const CONTROLLER_ACL = Symbol.for('EggPrototype#controller#acl');
export const CONTROLLER_TIMEOUT_METADATA = Symbol.for('EggPrototype#controller#timeout');

export const CONTROLLER_META_DATA = Symbol.for('EggPrototype#controller#metaData');

export const CONTROLLER_HTTP_PATH = Symbol.for('EggPrototype#controller#http#path');
export const CONTROLLER_METHOD_METHOD_MAP = Symbol.for('EggPrototype#controller#method#http#method');
export const CONTROLLER_METHOD_PATH_MAP = Symbol.for('EggPrototype#controller#method#http#path');
export const CONTROLLER_METHOD_PARAM_TYPE_MAP = Symbol.for('EggPrototype#controller#method#http#params#type');
export const CONTROLLER_METHOD_PARAM_NAME_MAP = Symbol.for('EggPrototype#controller#method#http#params#name');
export const CONTROLLER_METHOD_PRIORITY = Symbol.for('EggPrototype#controller#method#http#priority');

export const METHOD_CONTROLLER_TYPE_MAP = Symbol.for('EggPrototype#controller#mthods');
export const METHOD_CONTROLLER_HOST = Symbol.for('EggPrototype#controller#mthods#host');
export const METHOD_CONTEXT_INDEX = Symbol.for('EggPrototype#controller#method#context');
export const METHOD_MIDDLEWARES = Symbol.for('EggPrototype#method#middlewares');
export const METHOD_AOP_MIDDLEWARES = Symbol.for('EggPrototype#method#aopMiddlewares');
export const METHOD_AOP_REGISTER_MAP = Symbol.for('EggPrototype#method#aopMiddlewaresRegister');
export const METHOD_ACL = Symbol.for('EggPrototype#method#acl');
export const METHOD_TIMEOUT_METADATA = Symbol.for('EggPrototype#method#timeout');

export const CONTROLLER_MCP_NAME = Symbol.for('EggPrototype#controller#mcp#name');
export const CONTROLLER_MCP_VERSION = Symbol.for('EggPrototype#controller#mcp#version');
export const CONTROLLER_MCP_CONTROLLER_PARAMS_MAP = Symbol.for('EggPrototype#controller#mcp#controller#params');
export const CONTROLLER_MCP_RESOURCE_MAP = Symbol.for('EggPrototype#controller#mcp#resource');
export const CONTROLLER_MCP_RESOURCE_PARAMS_MAP = Symbol.for('EggPrototype#controller#mcp#resource#params');
export const CONTROLLER_MCP_TOOL_MAP = Symbol.for('EggPrototype#controller#mcp#tool');
export const CONTROLLER_MCP_TOOL_PARAMS_MAP = Symbol.for('EggPrototype#controller#mcp#tool#params');
export const CONTROLLER_MCP_TOOL_ARGS_INDEX = Symbol.for('EggPrototype#controller#mcp#tool#args');
export const CONTROLLER_MCP_EXTRA_INDEX = Symbol.for('EggPrototype#controller#mcp#tool#extra');
export const CONTROLLER_MCP_PROMPT_MAP = Symbol.for('EggPrototype#controller#mcp#prompt');
export const CONTROLLER_MCP_PROMPT_PARAMS_MAP = Symbol.for('EggPrototype#controller#mcp#prompt#params');
export const CONTROLLER_MCP_PROMPT_ARGS_INDEX = Symbol.for('EggPrototype#controller#mcp#prompt#args');
