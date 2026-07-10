import assert from 'node:assert';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { createWebSocketStream, WebSocket } from 'ws';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils';
import { fetchCloseEvents, fetchStreamCloseEvents } from '../fixtures/websocket/WebSocketController';

describe('standalone/service-worker/test/websocket/websocket.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;
  let port: number;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
    ({ app, server } = await TestUtils.createFetchApp('websocket'));
    port = (server.address() as AddressInfo).port;
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  beforeEach(() => {
    fetchCloseEvents.length = 0;
    fetchStreamCloseEvents.length = 0;
  });

  it('should handle websocket controller in standalone service worker', async () => {
    const ws = createClient('/ws/echo/123?name=tegg&tag=a&tag=b', {
      'x-client-id': 'standalone-client',
    });
    const ready = await waitJSONMessage(ws);

    assert.deepStrictEqual(ready, {
      type: 'ready',
      id: '123',
      name: 'tegg',
      tags: [ 'a', 'b' ],
      header: 'standalone-client',
      url: '/ws/echo/123?name=tegg&tag=a&tag=b',
      path: '/ws/echo/123',
    });

    ws.send('hello');
    const echo = await waitJSONMessage(ws);
    assert.deepStrictEqual(echo, {
      type: 'echo',
      data: 'hello',
    });

    await closeClient(ws);
  });

  it('should handle websocket stream controller in standalone service worker', async () => {
    const ws = createClient('/ws/stream/stream-id?name=stream-name');
    const input = createWebSocketStream(ws);
    const messages: unknown[] = [];
    const done = new Promise<void>((resolve, reject) => {
      input.on('data', data => {
        messages.push(JSON.parse(data.toString()));
        if (messages.length === 2) {
          resolve();
        }
      });
      input.on('error', reject);
    });

    await waitOpen(ws);
    input.write('first');
    await done;

    assert.deepStrictEqual(messages, [
      {
        type: 'ready',
        id: 'stream-id',
        name: 'stream-name',
      },
      {
        type: 'stream',
        data: 'first',
      },
    ]);

    input.end();
    await closeClient(ws);
  });

  it('should isolate two websocket fetch connections with interleaved responses in standalone service worker', async () => {
    const first = createClient('/ws-fetch/first?name=one&tag=a&tag=b', {
      'x-client-id': 'first-client',
    });
    const second = createClient('/ws-fetch/second?name=two&tag=c', {
      'x-client-id': 'second-client',
    });
    const firstMessages = createJSONMessageQueue(first);
    const secondMessages = createJSONMessageQueue(second);
    const firstInitialMessages = firstMessages.nextMany(2);
    const secondInitialMessages = secondMessages.nextMany(2);

    assert.deepStrictEqual(await firstInitialMessages, [
      {
        type: 'connection',
        header: 'first-client',
        path: '/ws-fetch/first',
      },
      {
        type: 'open',
        path: '/ws-fetch/first',
      },
    ]);
    assert.deepStrictEqual(await secondInitialMessages, [
      {
        type: 'connection',
        header: 'second-client',
        path: '/ws-fetch/second',
      },
      {
        type: 'open',
        path: '/ws-fetch/second',
      },
    ]);

    first.send(JSON.stringify({ content: 'slow', delayMs: 40 }));
    const firstPhase1 = await firstMessages.next();
    second.send(JSON.stringify({ content: 'fast', delayMs: 5, close: true }));
    const secondPhase1 = await secondMessages.next();
    const secondPhase2 = await secondMessages.next();
    const firstPhase2 = await firstMessages.next();

    assert.deepStrictEqual([
      firstPhase1,
      secondPhase1,
      secondPhase2,
      firstPhase2,
    ], [
      {
        type: 'data',
        phase: 1,
        id: 'first',
        name: 'one',
        tags: [ 'a', 'b' ],
        header: 'first-client',
        path: '/ws-fetch/first',
        content: 'slow',
      },
      {
        type: 'data',
        phase: 1,
        id: 'second',
        name: 'two',
        tags: [ 'c' ],
        header: 'second-client',
        path: '/ws-fetch/second',
        content: 'fast',
      },
      {
        type: 'data',
        phase: 2,
        id: 'second',
        content: 'fast',
      },
      {
        type: 'data',
        phase: 2,
        id: 'first',
        content: 'slow',
      },
    ]);

    await waitClose(second);
    await waitFor(() => fetchCloseEvents.includes('second:1000:server done'));

    first.send(JSON.stringify({
      content: 'broken',
      error: true,
      pipeline: true,
    }));
    assert.deepStrictEqual(await firstMessages.next(), {
      type: 'data',
      phase: 1,
      id: 'first',
      name: 'one',
      tags: [ 'a', 'b' ],
      header: 'first-client',
      path: '/ws-fetch/first',
      content: 'broken',
    });
    assert.deepStrictEqual(await firstMessages.next(), {
      type: 'error',
      message: 'fetch error: broken',
      header: 'first-client',
      path: '/ws-fetch/first',
    });
    await closeClient(first);
  });

  it('should serialize websocket fetch messages on the same connection in standalone service worker', async () => {
    const socket = createClient('/ws-fetch/serial');
    const messages = createJSONMessageQueue(socket);
    await messages.nextMany(2);

    socket.send(JSON.stringify({
      content: 'first',
      delayMs: 60,
    }));
    socket.send(JSON.stringify({
      content: 'second',
      delayMs: 5,
    }));

    const responses = await messages.nextMany(4);
    assert.deepStrictEqual(
      responses.map(response => `${response.content}:${response.phase}`),
      [ 'first:1', 'first:2', 'second:1', 'second:2' ],
    );
    assert.equal(socket.readyState, WebSocket.OPEN);
    await closeClient(socket);
  });

  it('should destroy only the closed connection websocket fetch streams in standalone service worker', async () => {
    const first = createClient('/ws-fetch/cleanup-first');
    const second = createClient('/ws-fetch/cleanup-second');
    const firstMessages = createJSONMessageQueue(first);
    const secondMessages = createJSONMessageQueue(second);

    await Promise.all([
      firstMessages.nextMany(2),
      secondMessages.nextMany(2),
    ]);

    first.send(JSON.stringify({
      content: 'hold',
      holdOpen: true,
      observeClose: true,
      pipeline: true,
    }));
    second.send(JSON.stringify({
      content: 'complete',
      delayMs: 20,
      observeClose: true,
    }));

    assert.equal((await firstMessages.next()).phase, 1);
    assert.equal((await secondMessages.next()).phase, 1);
    await closeClient(first);

    assert.deepStrictEqual(await secondMessages.next(), {
      type: 'data',
      phase: 2,
      id: 'cleanup-second',
      content: 'complete',
    });
    await waitFor(() => fetchStreamCloseEvents.includes('cleanup-first:hold:false:true'));
    await waitFor(() => fetchStreamCloseEvents.includes('source:cleanup-first:hold:false:true'));
    await waitFor(() => fetchStreamCloseEvents.includes('cleanup-second:complete:true:true'));

    await closeClient(second);
  });

  function createClient(path: string, headers?: Record<string, string>) {
    return new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });
  }
});

function waitOpen(ws: WebSocket) {
  if (ws.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function waitJSONMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    ws.once('message', data => resolve(JSON.parse(data.toString())));
    ws.once('error', reject);
  });
}

function createJSONMessageQueue(ws: WebSocket) {
  const messages: any[] = [];
  const waiters: Array<(value: any) => void> = [];

  ws.on('message', data => {
    const message = JSON.parse(data.toString());
    const waiter = waiters.shift();
    if (waiter) {
      waiter(message);
      return;
    }
    messages.push(message);
  });

  return {
    next() {
      const message = messages.shift();
      if (message) {
        return Promise.resolve(message);
      }
      return new Promise<any>(resolve => {
        waiters.push(resolve);
      });
    },
    async nextMany(count: number) {
      const result: any[] = [];
      while (result.length < count) {
        result.push(await this.next());
      }
      return result;
    },
  };
}

function waitClose(ws: WebSocket) {
  if (ws.readyState === WebSocket.CLOSED) {
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    ws.once('close', () => resolve());
  });
}

async function closeClient(ws: WebSocket) {
  if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    return;
  }
  ws.close();
  await waitClose(ws);
}

async function waitFor(predicate: () => boolean) {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert(predicate(), 'predicate should become true before timeout');
}
