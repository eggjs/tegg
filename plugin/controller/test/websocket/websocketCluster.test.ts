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

async function createClientWithFirstMessage(url: string) {
  const socket = new WebSocket(url);
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

async function waitForStreamCloseEvent(app, name: string, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await app.httpRequest()
      .get(`/apps/websocket-stream-events/${name}`)
      .set('connection', 'close')
      .expect(200);
    if (res.body.event) {
      return res.body.event;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail(`stream close event ${name} should be stored before timeout`);
}

describe('plugin/controller/test/websocket/websocketCluster.test.ts', () => {
  let app;

  before(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return pluginRoot;
    });
    const cluster = mm.cluster as any;
    app = cluster({
      baseDir: path.join(pluginRoot, 'test/fixtures/apps/controller-app'),
      framework: eggFramework,
      workers: 2,
      sticky: false,
      opt: {
        env: {
          ...process.env,
          NODE_OPTIONS: '--require ts-node/register tsconfig-paths/register',
        },
      },
    });
    await app.ready();
  });

  after(async () => {
    await app?.close();
  });

  it('should handle websocket controller in cluster', async () => {
    const entries = await Promise.all([ 1, 2, 3, 4 ].map(index => {
      return createClientWithFirstMessage(requestUrl(app, `/ws/echo/cluster-${index}?name=bar&tag=${index}`));
    }));
    const clients = entries.map(entry => entry.socket);
    try {
      const readyMessages = await Promise.all(entries.map(entry => entry.firstMessage));
      assert.equal(readyMessages.length, 4);
      for (const [ index, ready ] of readyMessages.entries()) {
        assert.equal(ready.type, 'ready');
        assert.equal(ready.id, `cluster-${index + 1}`);
        assert.equal(ready.name, 'bar');
        assert.deepEqual(ready.tags, [ String(index + 1) ]);
        assert.equal(ready.path, `/ws/echo/cluster-${index + 1}`);
        assert.equal(typeof ready.pid, 'number');
      }

      clients.forEach((socket, index) => socket.send(`hello-${index}`));
      const echoMessages = await Promise.all(clients.map(socket => receiveJSON(socket)));
      for (const [ index, echo ] of echoMessages.entries()) {
        assert.equal(echo.type, 'echo');
        assert.equal(echo.data, `hello-${index}`);
        assert.equal(typeof echo.pid, 'number');
      }
    } finally {
      await Promise.all(clients.map(socket => closeClient(socket)));
    }
  });

  it('should handle websocket stream params in cluster', async () => {
    const entries = await Promise.all([ 1, 2, 3, 4 ].map(index => {
      return createClientWithFirstMessage(requestUrl(app, `/ws/stream/stream-${index}?name=bar`));
    }));
    const clients = entries.map(entry => entry.socket);
    try {
      const readyMessages = await Promise.all(entries.map(entry => entry.firstMessage));
      assert.equal(readyMessages.length, 4);
      for (const [ index, ready ] of readyMessages.entries()) {
        assert.equal(ready.type, 'ready');
        assert.equal(ready.id, `stream-${index + 1}`);
        assert.equal(ready.name, 'bar');
        assert.equal(typeof ready.pid, 'number');
      }

      clients.forEach((socket, index) => socket.send(`stream-${index}`));
      const echoMessages = await Promise.all(clients.map(socket => receiveJSON(socket)));
      for (const [ index, echo ] of echoMessages.entries()) {
        assert.equal(echo.type, 'stream');
        assert.equal(echo.data, `stream-${index}`);
        assert.equal(typeof echo.pid, 'number');
      }
    } finally {
      await Promise.all(clients.map(socket => closeClient(socket)));
    }
  });

  it('should handle websocket fetch controller in cluster', async () => {
    const socket = new WebSocket(requestUrl(app, '/ws-fetch/cluster-fetch?name=bar&tag=cluster'), {
      headers: { 'x-client-id': 'cluster-fetch-client' },
    });
    const receiver = createJSONReceiver(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    try {
      const connection = await receiver.next();
      assert.equal(connection.type, 'connection');
      assert.equal(connection.header, 'cluster-fetch-client');
      assert.equal(connection.path, '/ws-fetch/cluster-fetch');
      assert.equal(typeof connection.pid, 'number');

      const open = await receiver.next();
      assert.equal(open.type, 'open');
      assert.equal(open.path, '/ws-fetch/cluster-fetch');
      assert.equal(typeof open.pid, 'number');

      socket.send(JSON.stringify({
        content: 'cluster-first',
      }));
      const first = await receiver.next();
      assert.equal(first.type, 'data');
      assert.equal(first.phase, 1);
      assert.equal(first.id, 'cluster-fetch');
      assert.equal(first.name, 'bar');
      assert.deepEqual(first.tags, [ 'cluster' ]);
      assert.equal(first.header, 'cluster-fetch-client');
      assert.equal(first.path, '/ws-fetch/cluster-fetch');
      assert.equal(first.content, 'cluster-first');
      assert.deepEqual(await receiver.next(), {
        type: 'data',
        phase: 2,
        id: 'cluster-fetch',
        content: 'cluster-first',
        pid: first.pid,
      });
      assert.equal(socket.readyState, WebSocket.OPEN);

      socket.send(JSON.stringify({
        content: 'cluster-broken',
        error: true,
        pipeline: true,
      }));
      const beforeError = await receiver.next();
      assert.equal(beforeError.type, 'data');
      assert.equal(beforeError.phase, 1);
      assert.equal(beforeError.content, 'cluster-broken');
      const error = await receiver.next();
      assert.deepEqual(error, {
        type: 'error',
        message: 'fetch error: cluster-broken',
        header: 'cluster-fetch-client',
        path: '/ws-fetch/cluster-fetch',
        pid: error.pid,
      });
      assert.equal(socket.readyState, WebSocket.OPEN);

      const closePromise = receiveClose(socket);
      socket.send(JSON.stringify({
        content: 'cluster-done',
        close: true,
      }));
      const closeData = await receiver.next();
      assert.equal(closeData.type, 'data');
      assert.equal(closeData.phase, 1);
      assert.equal(closeData.content, 'cluster-done');
      assert.deepEqual(await receiver.next(), {
        type: 'data',
        phase: 2,
        id: 'cluster-fetch',
        content: 'cluster-done',
        pid: closeData.pid,
      });
      assert.deepEqual(await closePromise, {
        code: 1000,
        reason: 'server done',
      });
    } finally {
      await closeClient(socket);
    }
  });

  it('should serialize websocket fetch messages on the same connection in cluster', async () => {
    const socket = new WebSocket(requestUrl(app, '/ws-fetch/cluster-serial'));
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

  it('should destroy only the closed connection websocket fetch streams in cluster', async () => {
    const firstSocket = new WebSocket(requestUrl(app, '/ws-fetch/cluster-cleanup-first'));
    const secondSocket = new WebSocket(requestUrl(app, '/ws-fetch/cluster-cleanup-second'));
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
      await Promise.all([
        firstMessages.next(),
        firstMessages.next(),
        secondMessages.next(),
        secondMessages.next(),
      ]);

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
        await waitForStreamCloseEvent(app, 'ws-fetch-stream-close-cluster-cleanup-first-hold'),
        'false:true',
      );
      assert.equal(
        await waitForStreamCloseEvent(app, 'ws-fetch-source-close-cluster-cleanup-first-hold'),
        'false:true',
      );
      assert.equal(
        await waitForStreamCloseEvent(app, 'ws-fetch-stream-close-cluster-cleanup-second-complete'),
        'true:true',
      );
    } finally {
      await Promise.all([
        closeClient(firstSocket),
        closeClient(secondSocket),
      ]);
    }
  });

});
