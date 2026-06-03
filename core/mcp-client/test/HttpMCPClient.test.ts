import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const majorVersion = parseInt(process.versions.node.split('.')[0], 10);

function createTestRequire() {
  const cwdPackagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(cwdPackagePath)) {
    const cwdPackage = JSON.parse(fs.readFileSync(cwdPackagePath, 'utf8'));
    if (cwdPackage.name === '@eggjs/mcp-client') {
      return createRequire(path.join(process.cwd(), 'test/HttpMCPClient.test.ts'));
    }
  }
  return createRequire(path.join(process.cwd(), 'core/mcp-client/test/HttpMCPClient.test.ts'));
}

describe('test/HttpMCPClient.test.ts', () => {
  if (majorVersion < 18) {
    return;
  }
  const requireModule = createTestRequire();
  const { HttpMCPClient } = requireModule('../src/HttpMCPClient') as typeof import('../src/HttpMCPClient');
  const { startSSEServer, stopSSEServer } = requireModule('./fixtures/sse-mcp-server/http') as typeof import('./fixtures/sse-mcp-server/http');
  const { startStreamableServer, stopStreamableServer } = requireModule('./fixtures/streamable-mcp-server/http') as typeof import('./fixtures/streamable-mcp-server/http');

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
    try {
      await client.init();
      const tools = await client.listTools();
      assert(tools);
    } finally {
      await client.close();
      await stopStreamableServer();
    }
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
    try {
      await client.init();
      const tools = await client.listTools();
      assert(tools);
    } finally {
      await client.close();
      await stopSSEServer();
    }
  });
});
