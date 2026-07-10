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

function createJSONReceiver(socket: WebSocket) {
  const messages: any[] = [];
  const waiters: Array<{ resolve: (value: any) => void; reject: (error: Error) => void }> = [];

  socket.on('message', data => {
    const message = JSON.parse(data.toString());
    const waiter = waiters.shift();
    if (waiter) {
      waiter.resolve(message);
      return;
    }
    messages.push(message);
  });
  socket.once('error', error => {
    while (waiters.length) {
      waiters.shift()!.reject(error);
    }
  });
  socket.once('close', () => {
    while (waiters.length) {
      waiters.shift()!.reject(new Error('websocket closed before message'));
    }
  });

  return {
    next() {
      if (messages.length) {
        return Promise.resolve(messages.shift());
      }
      return new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
    },
  };
}

function createTaggedJSONReceiver(entries: Array<{ name: string; socket: WebSocket }>) {
  const messages: Array<{ name: string; message: any }> = [];
  const waiters: Array<{ resolve: (value: { name: string; message: any }) => void; reject: (error: Error) => void }> = [];

  for (const entry of entries) {
    entry.socket.on('message', data => {
      const message = {
        name: entry.name,
        message: JSON.parse(data.toString()),
      };
      const waiter = waiters.shift();
      if (waiter) {
        waiter.resolve(message);
        return;
      }
      messages.push(message);
    });
    entry.socket.once('error', error => {
      while (waiters.length) {
        waiters.shift()!.reject(error);
      }
    });
    entry.socket.once('close', () => {
      while (waiters.length) {
        waiters.shift()!.reject(new Error(`websocket ${entry.name} closed before message`));
      }
    });
  }

  return {
    next() {
      if (messages.length) {
        return Promise.resolve(messages.shift()!);
      }
      return new Promise<{ name: string; message: any }>((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
    },
  };
}

async function receiveClose(socket: WebSocket): Promise<{ code: number; reason: string }> {
  return await new Promise(resolve => {
    socket.once('close', (code, reason) => {
      resolve({
        code,
        reason: reason.toString(),
      });
    });
  });
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

async function waitForStreamCloseEvent(app, name: string, timeout = 2000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await app.httpRequest()
      .get(`/apps/websocket-stream-events/${name}`)
      .set('connection', 'close')
      .expect(200);
    if (res.body.event) {
      return res.body.event;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`stream close event ${name} should be stored before timeout`);
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

  it('should handle websocket fetch controller', async () => {
    const socket = new WebSocket(requestUrl(app, '/ws-fetch/fetch-1?name=bar&tag=a&tag=b'), {
      headers: { 'x-client-id': 'client-fetch' },
    });
    const receiver = createJSONReceiver(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    try {
      const connection = await receiver.next();
      assert.deepEqual(connection, {
        type: 'connection',
        header: 'client-fetch',
        path: '/ws-fetch/fetch-1',
        pid: connection.pid,
      });
      assert.equal(typeof connection.pid, 'number');

      const open = await receiver.next();
      assert.deepEqual(open, {
        type: 'open',
        path: '/ws-fetch/fetch-1',
        pid: open.pid,
      });
      assert.equal(typeof open.pid, 'number');

      socket.send(JSON.stringify({
        content: 'first',
      }));
      const first = await receiver.next();
      assert.deepEqual(first, {
        type: 'data',
        phase: 1,
        id: 'fetch-1',
        name: 'bar',
        tags: [ 'a', 'b' ],
        header: 'client-fetch',
        path: '/ws-fetch/fetch-1',
        content: 'first',
        pid: first.pid,
      });
      assert.equal(typeof first.pid, 'number');
      assert.deepEqual(await receiver.next(), {
        type: 'data',
        phase: 2,
        id: 'fetch-1',
        content: 'first',
        pid: first.pid,
      });
      assert.equal(socket.readyState, WebSocket.OPEN);

      socket.send(JSON.stringify({
        content: 'broken',
        error: true,
        pipeline: true,
      }));
      const beforeError = await receiver.next();
      assert.equal(beforeError.type, 'data');
      assert.equal(beforeError.phase, 1);
      assert.equal(beforeError.content, 'broken');
      const error = await receiver.next();
      assert.deepEqual(error, {
        type: 'error',
        message: 'fetch error: broken',
        header: 'client-fetch',
        path: '/ws-fetch/fetch-1',
        pid: error.pid,
      });
      assert.equal(socket.readyState, WebSocket.OPEN);

      const closePromise = receiveClose(socket);
      socket.send(JSON.stringify({
        content: 'done',
        close: true,
      }));
      const closeData = await receiver.next();
      assert.equal(closeData.type, 'data');
      assert.equal(closeData.phase, 1);
      assert.equal(closeData.content, 'done');
      assert.deepEqual(await receiver.next(), {
        type: 'data',
        phase: 2,
        id: 'fetch-1',
        content: 'done',
        pid: closeData.pid,
      });
      assert.deepEqual(await closePromise, {
        code: 1000,
        reason: 'server done',
      });

      const res = await app.httpRequest()
        .get('/apps/ws-fetch-close-fetch-1')
        .expect(200);
      assert.equal(res.body.app.name, 'ws-fetch-close-fetch-1');
      assert.equal(res.body.app.desc, '1000:server done');
    } finally {
      await closeClient(socket);
    }
  });

  it('should serialize websocket fetch messages on the same connection', async () => {
    const socket = new WebSocket(requestUrl(app, '/ws-fetch/serial'));
    const receiver = createJSONReceiver(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });

    try {
      await receiver.next();
      await receiver.next();

      socket.send(JSON.stringify({
        content: 'first',
        delayMs: 60,
      }));
      socket.send(JSON.stringify({
        content: 'second',
        delayMs: 5,
      }));

      const messages = [
        await receiver.next(),
        await receiver.next(),
        await receiver.next(),
        await receiver.next(),
      ];
      assert.deepEqual(
        messages.map(message => `${message.content}:${message.phase}`),
        [ 'first:1', 'first:2', 'second:1', 'second:2' ],
      );
      assert.equal(socket.readyState, WebSocket.OPEN);
    } finally {
      await closeClient(socket);
    }
  });

  it('should isolate two websocket fetch connections with interleaved data', async () => {
    const firstSocket = new WebSocket(requestUrl(app, '/ws-fetch/cross-1?name=first&tag=a'), {
      headers: { 'x-client-id': 'client-cross-1' },
    });
    const secondSocket = new WebSocket(requestUrl(app, '/ws-fetch/cross-2?name=second&tag=b'), {
      headers: { 'x-client-id': 'client-cross-2' },
    });
    const receiver = createTaggedJSONReceiver([
      { name: 'first', socket: firstSocket },
      { name: 'second', socket: secondSocket },
    ]);
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        firstSocket.once('open', resolve);
        firstSocket.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        secondSocket.once('open', resolve);
        secondSocket.once('error', reject);
      }),
    ]);

    try {
      const lifecycleMessages = [
        await receiver.next(),
        await receiver.next(),
        await receiver.next(),
        await receiver.next(),
      ];
      assert.deepEqual(
        lifecycleMessages
          .map(item => `${item.name}:${item.message.type}:${item.message.path}`)
          .sort(),
        [
          'first:connection:/ws-fetch/cross-1',
          'first:open:/ws-fetch/cross-1',
          'second:connection:/ws-fetch/cross-2',
          'second:open:/ws-fetch/cross-2',
        ],
      );

      firstSocket.send(JSON.stringify({
        content: 'from-first',
        delayMs: 80,
      }));
      const firstPhase1 = await receiver.next();
      assert.equal(firstPhase1.name, 'first');
      assert.deepEqual(firstPhase1.message, {
        type: 'data',
        phase: 1,
        id: 'cross-1',
        name: 'first',
        tags: [ 'a' ],
        header: 'client-cross-1',
        path: '/ws-fetch/cross-1',
        content: 'from-first',
        pid: firstPhase1.message.pid,
      });

      secondSocket.send(JSON.stringify({
        content: 'from-second',
        delayMs: 10,
      }));
      const secondPhase1 = await receiver.next();
      assert.equal(secondPhase1.name, 'second');
      assert.deepEqual(secondPhase1.message, {
        type: 'data',
        phase: 1,
        id: 'cross-2',
        name: 'second',
        tags: [ 'b' ],
        header: 'client-cross-2',
        path: '/ws-fetch/cross-2',
        content: 'from-second',
        pid: secondPhase1.message.pid,
      });

      const secondPhase2 = await receiver.next();
      assert.deepEqual(secondPhase2, {
        name: 'second',
        message: {
          type: 'data',
          phase: 2,
          id: 'cross-2',
          content: 'from-second',
          pid: secondPhase1.message.pid,
        },
      });

      const firstPhase2 = await receiver.next();
      assert.deepEqual(firstPhase2, {
        name: 'first',
        message: {
          type: 'data',
          phase: 2,
          id: 'cross-1',
          content: 'from-first',
          pid: firstPhase1.message.pid,
        },
      });

      assert.equal(firstSocket.readyState, WebSocket.OPEN);
      assert.equal(secondSocket.readyState, WebSocket.OPEN);
    } finally {
      await Promise.all([
        closeClient(firstSocket),
        closeClient(secondSocket),
      ]);
    }
  });

  it('should destroy only the closed connection websocket fetch streams', async () => {
    const firstSocket = new WebSocket(requestUrl(app, '/ws-fetch/cleanup-first'));
    const secondSocket = new WebSocket(requestUrl(app, '/ws-fetch/cleanup-second'));
    const firstMessages = createJSONReceiver(firstSocket);
    const secondMessages = createJSONReceiver(secondSocket);

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        firstSocket.once('open', resolve);
        firstSocket.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        secondSocket.once('open', resolve);
        secondSocket.once('error', reject);
      }),
    ]);

    try {
      const [ firstInitial, secondInitial ] = await Promise.all([
        Promise.all([ firstMessages.next(), firstMessages.next() ]),
        Promise.all([ secondMessages.next(), secondMessages.next() ]),
      ]);
      assert.deepEqual(firstInitial.map(message => message.type), [ 'connection', 'open' ]);
      assert.deepEqual(secondInitial.map(message => message.type), [ 'connection', 'open' ]);

      firstSocket.send(JSON.stringify({
        content: 'hold',
        holdOpen: true,
        observeClose: true,
        pipeline: true,
      }));
      secondSocket.send(JSON.stringify({
        content: 'complete',
        delayMs: 20,
        observeClose: true,
      }));

      assert.equal((await firstMessages.next()).phase, 1);
      assert.equal((await secondMessages.next()).phase, 1);
      await closeClient(firstSocket);

      const secondPhase2 = await secondMessages.next();
      assert.equal(secondPhase2.phase, 2);
      assert.equal(secondPhase2.content, 'complete');

      assert.equal(
        await waitForStreamCloseEvent(app, 'ws-fetch-stream-close-cleanup-first-hold'),
        'false:true',
      );
      assert.equal(
        await waitForStreamCloseEvent(app, 'ws-fetch-source-close-cleanup-first-hold'),
        'false:true',
      );
      assert.equal(
        await waitForStreamCloseEvent(app, 'ws-fetch-stream-close-cleanup-second-complete'),
        'true:true',
      );
    } finally {
      await Promise.all([
        closeClient(firstSocket),
        closeClient(secondSocket),
      ]);
    }
  });

  it('should reject unmatched websocket route', async () => {
    await assert.rejects(
      () => createClient(requestUrl(app, '/ws/not-found')),
      /Unexpected server response: 404/,
    );
  });
});
