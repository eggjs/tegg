import http from 'node:http';
import type { Context } from 'egg';

export interface MCPControllerParams {
  protoName?: string;
  controllerName?: string;
  name?: string;
  version?: string;
}

export interface MCPControllerHook {
  preHandle?: (ctx: Context) => Promise<void>
  preProxy?: (ctx: Context, proxyReq: Parameters<typeof http.createServer>['0'], proxyResp: Parameters<typeof http.createServer>['1']) => Promise<void>
}
