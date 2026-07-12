import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import {
  WebSocketEventStream,
  WebSocketFetchSession,
  waitForWebSocketClose,
} from '..';

class FakeWebSocket extends EventEmitter {
  readyState = 1;
  readonly sent: unknown[] = [];
  sendsInFlight = 0;
  maxSendsInFlight = 0;
  closeCode?: number;
  closeReason?: string | Buffer;
  onSend?: (data: unknown, callback: (error?: Error) => void) => void;

  send(data: unknown, callback: (error?: Error) => void = () => undefined) {
    this.sent.push(data);
    this.sendsInFlight++;
    this.maxSendsInFlight = Math.max(this.maxSendsInFlight, this.sendsInFlight);
    const done = (error?: Error) => {
      this.sendsInFlight--;
      callback(error);
    };
    if (this.onSend) {
      this.onSend(data, done);
      return;
    }
    setImmediate(done);
  }

  close(code = 1000, reason: string | Buffer = Buffer.alloc(0)) {
    if (this.readyState > 1) {
      return;
    }
    this.readyState = 3;
    this.closeCode = code;
    this.closeReason = reason;
    this.emit('close', code, reason);
  }
}

describe('test/WebSocketFetchSession.test.ts', () => {
  it('should keep waiting for close after a socket error', async () => {
    const socket = new FakeWebSocket();
    const errors: Error[] = [];
    let resolved = false;
    const closed = waitForWebSocketClose(socket, error => errors.push(error));
    closed.then(() => {
      resolved = true;
    });

    const error = new Error('socket failed');
    socket.emit('error', error);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(errors, [ error ]);
    assert.equal(resolved, false);

    socket.close();
    await closed;
    assert.equal(resolved, true);
  });

  it('should process response streams in request order with send backpressure', async () => {
    const socket = new FakeWebSocket();
    const events = new WebSocketEventStream<string, Buffer>(socket);
    const calls: string[] = [];
    socket.onSend = (data, callback) => {
      calls.push(`send:${String(data)}`);
      setTimeout(() => {
        callback();
        if (socket.sent.length === 4) {
          socket.close();
        }
      }, 5);
    };
    const session = new WebSocketFetchSession({
      socket,
      events,
      onConnection: () => calls.push('connection'),
      onOpen: () => calls.push('open'),
      onData: data => {
        calls.push(`data:${data}`);
        return Readable.from([ `${data}:1`, `${data}:2` ]);
      },
      onClose: () => calls.push('close'),
      logError: (_message, error) => assert.fail(error),
    });

    socket.emit('message', 'first');
    socket.emit('message', 'second');
    await session.run();

    assert.deepEqual(calls, [
      'connection',
      'open',
      'data:first',
      'send:first:1',
      'send:first:2',
      'data:second',
      'send:second:1',
      'send:second:2',
      'close',
    ]);
    assert.equal(socket.maxSendsInFlight, 1);
  });

  it('should destroy the active response and discard queued messages on close', async () => {
    const socket = new FakeWebSocket();
    const events = new WebSocketEventStream<string, Buffer>(socket);
    const output = new PassThrough();
    const messages: string[] = [];
    let closed = false;
    const session = new WebSocketFetchSession({
      socket,
      events,
      onData: data => {
        messages.push(data);
        setImmediate(() => socket.close(1001, Buffer.from('gone')));
        return output;
      },
      onClose: (code, reason) => {
        assert.equal(code, 1001);
        assert.equal(reason.toString(), 'gone');
        closed = true;
      },
      logError: (_message, error) => assert.fail(error),
    });

    socket.emit('message', 'first');
    socket.emit('message', 'second');
    await session.run();

    assert.deepEqual(messages, [ 'first' ]);
    assert.equal(output.destroyed, true);
    assert.equal(closed, true);
  });

  it('should invoke lifecycle and error handlers through the context runner', async () => {
    const socket = new FakeWebSocket();
    const events = new WebSocketEventStream<string, Buffer>(socket);
    let inContext = false;
    const handlers: string[] = [];
    const session = new WebSocketFetchSession({
      socket,
      events,
      runInContext: async callback => {
        assert.equal(inContext, false);
        inContext = true;
        try {
          return await callback();
        } finally {
          inContext = false;
        }
      },
      onConnection: () => {
        assert.equal(inContext, true);
        handlers.push('connection');
      },
      onOpen: () => {
        assert.equal(inContext, true);
        handlers.push('open');
      },
      onData: () => {
        assert.equal(inContext, true);
        handlers.push('data');
        throw new Error('data failed');
      },
      onError: error => {
        assert.equal(inContext, true);
        assert.equal(error.message, 'data failed');
        handlers.push('error');
        socket.close();
      },
      onClose: () => {
        assert.equal(inContext, true);
        handlers.push('close');
      },
      logError: (_message, error) => assert.fail(error),
    });

    socket.emit('message', 'request');
    await session.run();

    assert.deepEqual(handlers, [ 'connection', 'open', 'data', 'error', 'close' ]);
  });

  it('should close the connection after handling a fatal data error', async () => {
    const socket = new FakeWebSocket();
    const events = new WebSocketEventStream<string, Buffer>(socket);
    const fatalError = new Error('timeout');
    const handlers: string[] = [];
    const session = new WebSocketFetchSession({
      socket,
      events,
      onData: () => {
        throw fatalError;
      },
      onError: error => {
        assert.equal(error, fatalError);
        handlers.push('error');
      },
      onClose: () => handlers.push('close'),
      isFatalError: error => error === fatalError,
      logError: (_message, error) => assert.fail(error),
    });

    socket.emit('message', 'request');
    await session.run();

    assert.deepEqual(handlers, [ 'error', 'close' ]);
    assert.equal(socket.closeCode, 1011);
    assert.equal(socket.closeReason, 'Internal Server Error');
  });
});
