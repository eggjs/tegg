import http from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';

// Create an MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0"
});

// Add an addition tool
server.registerTool("add",
  {
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

// Add a dynamic greeting resource
server.registerResource(
  "greeting",
  "greeting://{name}",
  {},
  // @ts-ignore
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

export const headers = {};

export let httpServer: http.Server | undefined;
export async function startStreamableServer(port = 17243){
  httpServer = http.createServer(async (req, res) => {
    const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const url = new URL(`http://127.0.0.1:${port}${req.url!}`);
    const headerKey = `${req.method}${url.pathname}`;
    const serverCode = req.headers['x-mcp-server-code'] as string;
    headers[serverCode] = headers[serverCode] || {};
    headers[serverCode][headerKey] = headers[serverCode][headerKey] || [];
    headers[serverCode][headerKey].push(req.headers);
    if (req.method === 'POST') {
      try {
        const transport: typeof StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        await transport.handleRequest(req, res);
        res.on('close', () => {
          console.log('Request closed');
          transport.close();
          server.close();
        });
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          }));
        }
      }
    } else {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found',
        },
        id: null,
      }));
    }
  });
  const serverToListen = httpServer;
  return new Promise<void>((resolve, reject) => {
    function onError(err: Error) {
      serverToListen.removeListener('listening', onListening);
      reject(err);
    }
    function onListening() {
      serverToListen.removeListener('error', onError);
      resolve();
    }
    serverToListen.once('error', onError);
    serverToListen.listen(port, onListening);
  });
}

export async function stopStreamableServer() {
  await Promise.resolve(server.close()).catch(() => undefined);
  if (!httpServer) {
    return;
  }
  const serverToClose = httpServer;
  httpServer = undefined;
  await new Promise<void>((resolve, reject) => {
    serverToClose.close(err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
