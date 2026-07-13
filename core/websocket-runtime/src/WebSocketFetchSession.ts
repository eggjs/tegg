export const WEBSOCKET_OPEN_STATE = 1;
export const WEBSOCKET_CONNECTING_STATE = 0;
export const WEBSOCKET_INTERNAL_ERROR_CODE = 1011;
export const WEBSOCKET_INTERNAL_ERROR_REASON = 'Internal Server Error';

export interface WebSocketSessionSocket {
  on(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  send(data: any, callback?: (error?: Error) => void): void;
  close(code?: number, reason?: string | Buffer): void;
  readonly readyState: number;
}

export function waitForWebSocketClose(
  socket: WebSocketSessionSocket,
  onError: (error: Error) => void,
): Promise<void> {
  if (socket.readyState >= 2) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const handleError = (error: Error) => onError(error);
    const handleClose = () => {
      socket.removeListener('close', handleClose);
      socket.removeListener('error', handleError);
      resolve();
    };
    socket.on('close', handleClose);
    socket.on('error', handleError);
  });
}

export type WebSocketSessionEvent<Data = unknown, CloseReason = Buffer> =
  | { type: 'connection' }
  | { type: 'open' }
  | { type: 'message'; data: Data }
  | { type: 'error'; error: Error }
  | { type: 'close'; code: number; reason: CloseReason };

type EventIteratorResult<Data, CloseReason> = IteratorResult<WebSocketSessionEvent<Data, CloseReason>>;

/** Captures socket events immediately and exposes them as a single ordered event stream. */
export class WebSocketEventStream<Data = unknown, CloseReason = Buffer>
implements AsyncIterable<WebSocketSessionEvent<Data, CloseReason>>, AsyncIterator<WebSocketSessionEvent<Data, CloseReason>> {
  private events: Array<WebSocketSessionEvent<Data, CloseReason>> = [];
  private waiters: Array<(result: EventIteratorResult<Data, CloseReason>) => void> = [];
  private closeListeners = new Set<() => void>();
  private disposed = false;
  private closeYielded = false;
  private droppedMessages = 0;
  private readonly onMessage = (data: Data) => {
    this.enqueue({ type: 'message', data });
  };
  private readonly onError = (error: Error) => {
    this.enqueue({ type: 'error', error });
  };
  private readonly onClose = (code: number, reason: CloseReason) => {
    if (this.disposed) {
      return;
    }
    for (const listener of this.closeListeners) {
      listener();
    }
    this.closeListeners.clear();
    this.droppedMessages += this.events.filter(event => event.type === 'message').length;
    this.events = this.events.filter(event => event.type === 'connection' || event.type === 'open');
    this.socket.removeListener('message', this.onMessage);
    this.socket.removeListener('error', this.onError);
    this.socket.removeListener('close', this.onClose);
    this.enqueue({ type: 'close', code, reason });
  };

  constructor(private readonly socket: WebSocketSessionSocket) {
    this.socket.on('message', this.onMessage);
    this.socket.on('error', this.onError);
    this.socket.on('close', this.onClose);
    this.enqueue({ type: 'connection' });
    this.enqueue({ type: 'open' });
  }

  get closed(): boolean {
    return this.closeYielded || this.events.some(event => event.type === 'close');
  }

  get droppedMessageCount(): number {
    return this.droppedMessages;
  }

  [Symbol.asyncIterator](): AsyncIterator<WebSocketSessionEvent<Data, CloseReason>> {
    return this;
  }

  next(): Promise<EventIteratorResult<Data, CloseReason>> {
    if (this.disposed || this.closeYielded) {
      return Promise.resolve({ done: true, value: undefined });
    }
    const event = this.events.shift();
    if (event) {
      if (event.type === 'close') {
        this.closeYielded = true;
      }
      return Promise.resolve({ done: false, value: event });
    }
    return new Promise(resolve => this.waiters.push(resolve));
  }

  return(): Promise<EventIteratorResult<Data, CloseReason>> {
    this.dispose();
    return Promise.resolve({ done: true, value: undefined });
  }

  onSocketClose(listener: () => void): () => void {
    if (this.closed) {
      listener();
      return () => undefined;
    }
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.socket.removeListener('message', this.onMessage);
    this.socket.removeListener('error', this.onError);
    this.socket.removeListener('close', this.onClose);
    this.events = [];
    this.closeListeners.clear();
    for (const resolve of this.waiters.splice(0)) {
      resolve({ done: true, value: undefined });
    }
  }

  private enqueue(event: WebSocketSessionEvent<Data, CloseReason>) {
    if (this.disposed || this.closeYielded) {
      return;
    }
    const resolve = this.waiters.shift();
    if (resolve) {
      if (event.type === 'close') {
        this.closeYielded = true;
      }
      resolve({ done: false, value: event });
      return;
    }
    this.events.push(event);
  }
}

export interface WebSocketFetchSessionOptions<Data = unknown, CloseReason = Buffer> {
  socket: WebSocketSessionSocket;
  events: WebSocketEventStream<Data, CloseReason>;
  runInContext?<T>(callback: () => Promise<T>): Promise<T>;
  onConnection?(): unknown | Promise<unknown>;
  onOpen?(): unknown | Promise<unknown>;
  onData(data: Data): unknown | Promise<unknown>;
  onError?(error: Error): unknown | Promise<unknown>;
  onClose?(code: number, reason: CloseReason): unknown | Promise<unknown>;
  logError(message: string, error: Error): void;
  logDebug?(message: string): void;
  isFatalError?(error: Error): boolean;
}

interface AsyncReadableStream extends AsyncIterable<unknown> {
  pipe(...args: any[]): unknown;
  destroy(error?: Error): void;
}

export class WebSocketFetchSession<Data = unknown, CloseReason = Buffer> {
  private acceptingData = true;

  readonly close = (code = 1000, reason?: string | Buffer) => {
    const { socket } = this.options;
    if (socket.readyState !== WEBSOCKET_OPEN_STATE && socket.readyState !== WEBSOCKET_CONNECTING_STATE) {
      return;
    }
    socket.close(code, reason);
  };

  constructor(private readonly options: WebSocketFetchSessionOptions<Data, CloseReason>) {}

  async run(): Promise<void> {
    try {
      for await (const event of this.options.events) {
        await this.dispatch(event);
      }
    } finally {
      this.options.events.dispose();
    }
  }

  private async dispatch(event: WebSocketSessionEvent<Data, CloseReason>) {
    switch (event.type) {
      case 'connection':
        await this.invokeLifecycle('connection', this.options.onConnection);
        break;
      case 'open':
        await this.invokeLifecycle('open', this.options.onOpen);
        break;
      case 'message':
        await this.invokeData(event.data);
        break;
      case 'error':
        await this.handleError(event.error);
        break;
      case 'close':
        if (this.options.events.droppedMessageCount > 0) {
          this.options.logDebug?.(
            `Discarded ${this.options.events.droppedMessageCount} queued WebSocket fetch message(s) after close`,
          );
        }
        await this.invokeClose(event.code, event.reason);
        break;
      default:
        break;
    }
  }

  private async invokeLifecycle(name: 'connection' | 'open', callback: (() => unknown | Promise<unknown>) | undefined) {
    if (!callback || !this.acceptingData || this.options.events.closed) {
      return;
    }
    try {
      await this.runInContext(async () => await callback());
    } catch (error) {
      const normalizedError = this.toError(error);
      this.acceptingData = false;
      this.options.logError(`WebSocket fetch ${name} handler failed`, normalizedError);
      await this.handleError(normalizedError);
      this.close(WEBSOCKET_INTERNAL_ERROR_CODE, WEBSOCKET_INTERNAL_ERROR_REASON);
    }
  }

  private async invokeData(data: Data) {
    if (!this.acceptingData || this.options.events.closed || this.options.socket.readyState !== WEBSOCKET_OPEN_STATE) {
      this.options.logDebug?.('Discarded a WebSocket fetch message because the connection is not open');
      return;
    }
    try {
      const result = await this.runInContext(async () => await this.options.onData(data));
      await this.sendResponse(result);
    } catch (error) {
      if (!this.options.events.closed) {
        const normalizedError = this.toError(error);
        await this.handleError(normalizedError);
        if (this.options.isFatalError?.(normalizedError)) {
          this.close(WEBSOCKET_INTERNAL_ERROR_CODE, WEBSOCKET_INTERNAL_ERROR_REASON);
        }
      }
    }
  }

  private async invokeClose(code: number, reason: CloseReason) {
    if (!this.options.onClose) {
      return;
    }
    try {
      await this.runInContext(async () => await this.options.onClose!(code, reason));
    } catch (error) {
      this.options.logError('WebSocket fetch close handler failed', this.toError(error));
    }
  }

  private async handleError(error: Error) {
    if (!this.options.onError) {
      this.options.logError('WebSocket fetch request failed', error);
      return;
    }
    try {
      await this.runInContext(async () => await this.options.onError!(error));
    } catch (handlerError) {
      this.options.logError('WebSocket fetch error handler failed', this.toError(handlerError));
    }
  }

  private async sendResponse(result: unknown) {
    if (result === undefined || result === null) {
      return;
    }
    if (!this.isReadableStream(result)) {
      await this.handleError(new Error('WebSocketFetch method must return a readable stream or void'));
      return;
    }
    if (this.options.events.closed || this.options.socket.readyState !== WEBSOCKET_OPEN_STATE) {
      this.destroyResponseStream(result);
      return;
    }

    const removeCloseListener = this.options.events.onSocketClose(() => this.destroyResponseStream(result));
    try {
      for await (const chunk of result) {
        if (this.options.events.closed || this.options.socket.readyState !== WEBSOCKET_OPEN_STATE) {
          this.destroyResponseStream(result);
          return;
        }
        await this.sendChunk(chunk);
      }
    } finally {
      removeCloseListener();
    }
  }

  private sendChunk(chunk: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.options.events.closed || this.options.socket.readyState !== WEBSOCKET_OPEN_STATE) {
        resolve();
        return;
      }
      this.options.socket.send(chunk, error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private destroyResponseStream(stream: AsyncReadableStream) {
    try {
      stream.destroy();
    } catch (error) {
      this.options.logError('WebSocket fetch response stream destroy failed', this.toError(error));
    }
  }

  private runInContext<T>(callback: () => Promise<T>): Promise<T> {
    if (this.options.runInContext) {
      return this.options.runInContext(callback);
    }
    return callback();
  }

  private isReadableStream(result: unknown): result is AsyncReadableStream {
    const stream = result as Partial<AsyncReadableStream> | undefined;
    return !!stream &&
      typeof stream.pipe === 'function' &&
      typeof stream.destroy === 'function' &&
      typeof stream[Symbol.asyncIterator] === 'function';
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}
