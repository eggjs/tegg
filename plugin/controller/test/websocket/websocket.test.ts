import { strict as assert } from 'node:assert';
import path from 'node:path';
import mm from 'egg-mock';
import WebSocket from 'ws';
import type { RawData } from 'ws';

const pluginRoot = process.cwd();
const eggFramework = path.join(pluginRoot, '../../node_modules/egg');

function requestUrl(app, pathname: string) {
  return app.httpRequest().get(pathname).url.replace(/^http/, 'ws');
}

async function createClient(url: string, headers?: Record<string, string>): Promise<WebSocket> {
  const socket = new WebSocket(url, { headers });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return socket;
}

async function receiveJSON(socket: WebSocket): Promise<any> {
  const data = await new Promise<RawData>((resolve, reject) => {
    socket.once('message', resolve);
    socket.once('error', reject);
    socket.once('close', () => reject(new Error('websocket closed before message')));
  });
  return JSON.parse(data.toString());
}

async function createClientWithFirstMessage(url: string, headers?: Record<string, string>) {
  const socket = new WebSocket(url, { headers });
  const firstMessage = receiveJSON(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return { socket, firstMessage };
}

async function closeClient(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) {
    return;
  }
  await new Promise<void>(resolve => {
    socket.once('close', () => resolve());
    socket.close();
  });
}

describe('plugin/controller/test/websocket/websocket.test.ts', () => {
  let app;

  beforeEach(() => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
  });

  afterEach(() => {
    mm.restore();
  });

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return pluginRoot;
    });
    app = mm.app({
      baseDir: path.join(pluginRoot, 'test/fixtures/apps/controller-app'),
      framework: eggFramework,
    });
    await app.ready();
  });

  after(async () => {
    await app?.close();
  });

  it('should handle websocket controller', async () => {
    const { socket, firstMessage } = await createClientWithFirstMessage(
      requestUrl(app, '/ws/echo/foo?name=bar&tag=a&tag=b'),
      { 'x-client-id': 'client-1' },
    );
    try {
      const ready = await firstMessage;
      assert.deepEqual(ready, {
        type: 'ready',
        id: 'foo',
        name: 'bar',
        tags: [ 'a', 'b' ],
        app: {
          name: 'foo',
          desc: 'ws:bar',
        },
        header: 'client-1',
        url: '/ws/echo/foo?name=bar&tag=a&tag=b',
        path: '/ws/echo/foo',
        pid: ready.pid,
      });
      assert.equal(typeof ready.pid, 'number');

      socket.send('hello');
      const echo = await receiveJSON(socket);
      assert.deepEqual(echo, {
        type: 'echo',
        data: 'hello',
        pid: ready.pid,
      });
    } finally {
      await closeClient(socket);
    }
  });

  it('should handle websocket stream param and returned stream', async () => {
    const { socket, firstMessage } = await createClientWithFirstMessage(
      requestUrl(app, '/ws/stream/foo?name=bar'),
    );
    try {
      const ready = await firstMessage;
      assert.deepEqual(ready, {
        type: 'ready',
        id: 'foo',
        name: 'bar',
        pid: ready.pid,
      });
      assert.equal(typeof ready.pid, 'number');

      socket.send('hello-stream');
      const echo = await receiveJSON(socket);
      assert.deepEqual(echo, {
        type: 'stream',
        data: 'hello-stream',
        pid: ready.pid,
      });
    } finally {
      await closeClient(socket);
    }
  });

  it('should reject unmatched websocket route', async () => {
    await assert.rejects(
      () => createClient(requestUrl(app, '/ws/not-found')),
      /Unexpected server response: 404/,
    );
  });
});
