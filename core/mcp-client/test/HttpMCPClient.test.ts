import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpMCPClient } from '../src/HttpMCPClient';
import { startSSEServer, stopSSEServer } from './fixtures/sse-mcp-server/http';
import { startStreamableServer, stopStreamableServer } from './fixtures/streamable-mcp-server/http';
const majorVersion = parseInt(process.versions.node.split('.')[0], 10);

describe('test/HttpMCPClient.test.ts', () => {
  if (majorVersion < 18) {
    return;
  }
  it('should work', async () => {
    await startStreamableServer();
    const client = new HttpMCPClient({
      name: 'test',
      version: '1.0.0',
    }, {
      transportType: 'STREAMABLE_HTTP',
      logger: console as any,
      url: 'http://127.0.0.1:17243',
    });
    await client.init();
    const tools = await client.listTools();
    assert(tools);
    await stopStreamableServer();
  });
  it('should sse work', async () => {
    await startSSEServer();
    const client = new HttpMCPClient({
      name: 'test',
      version: '1.0.0',
    }, {
      transportType: 'SSE',
      logger: console as any,
      transportOptions: {
        requestInit: {
          headers: {
            'SOFA-TraceId': randomUUID(),
            'SOFA-RpcId': '0.1',
          },
        },
      },
      url: 'http://127.0.0.1:17233/mcp/sse',
    });
    await client.init();
    const tools = await client.listTools();
    assert(tools);
    await stopSSEServer();
  });
});
