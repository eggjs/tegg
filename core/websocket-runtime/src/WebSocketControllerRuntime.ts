import assert from 'node:assert';
import { Duplex, pipeline } from 'node:stream';
import {
  WebSocketControllerMeta,
  WebSocketFetchControllerMeta,
  WebSocketFetchMethodMeta,
  WebSocketMethodMeta,
  WebSocketParamType,
  WebSocketPathParamMeta,
  WebSocketQueriesParamMeta,
  WebSocketQueryParamMeta,
} from '@eggjs/controller-decorator';
import type { WebSocketFetchClose } from '@eggjs/controller-decorator';
import { TimerUtil } from '@eggjs/tegg-common-util';
import {
  WebSocketEventStream,
  WebSocketFetchSession,
  WebSocketSessionSocket,
  WEBSOCKET_INTERNAL_ERROR_CODE,
  WEBSOCKET_INTERNAL_ERROR_REASON,
} from './WebSocketFetchSession';

export interface WebSocketRuntimeContext<Socket extends WebSocketSessionSocket> {
  context: unknown;
  socket: Socket;
  params: Record<string, string>;
  query: Record<string, unknown>;
  queries: Record<string, unknown[]>;
  headers: unknown;
  request: unknown;
}

export interface WebSocketRuntimeLogger {
  debug(message: string): void;
  error(message: string, error?: Error): void;
}

export interface WebSocketControllerRuntimeOptions<Socket extends WebSocketSessionSocket> {
  context: WebSocketRuntimeContext<Socket>;
  createWebSocketStream(socket: Socket): Duplex;
  logger: WebSocketRuntimeLogger;
  runInContext?<T>(callback: () => Promise<T>): Promise<T>;
}

interface WebSocketMethodPayload<Data = unknown, CloseReason = unknown> {
  data?: Data;
  close?: WebSocketFetchClose;
  error?: Error;
  closeCode?: number;
  closeReason?: CloseReason;
  getWebSocketStream?: () => Duplex;
}

type WebSocketControllerObject = object;

export class WebSocketControllerRuntime<
  Socket extends WebSocketSessionSocket,
  Data = unknown,
  CloseReason = Buffer,
> {
  constructor(private readonly options: WebSocketControllerRuntimeOptions<Socket>) {}

  async invokeController(
    realObj: WebSocketControllerObject,
    controllerMeta: WebSocketControllerMeta,
    methodMeta: WebSocketMethodMeta,
  ) {
    let webSocketStream: Duplex | undefined;
    const getWebSocketStream = () => {
      if (!webSocketStream) {
        webSocketStream = this.options.createWebSocketStream(this.options.context.socket);
      }
      return webSocketStream;
    };
    const result = await this.invokeMethod(realObj, controllerMeta, methodMeta, { getWebSocketStream });
    this.pipeResponseStream(result, getWebSocketStream);
  }

  async invokeFetchController(
    realObj: WebSocketControllerObject,
    controllerMeta: WebSocketFetchControllerMeta,
    methodMeta: WebSocketFetchMethodMeta,
    events: WebSocketEventStream<Data, CloseReason>,
  ) {
    let session!: WebSocketFetchSession<Data, CloseReason>;
    const invokeMethod = (
      targetMethodMeta: WebSocketFetchMethodMeta | undefined,
      payload: WebSocketMethodPayload<Data, CloseReason> = {},
    ) => {
      if (!targetMethodMeta) {
        return undefined;
      }
      return this.invokeMethod(realObj, controllerMeta, targetMethodMeta, {
        close: session.close,
        ...payload,
      });
    };

    session = new WebSocketFetchSession({
      socket: this.options.context.socket,
      events,
      runInContext: this.options.runInContext,
      onConnection: controllerMeta.connectionMethod
        ? () => invokeMethod(controllerMeta.connectionMethod)
        : undefined,
      onOpen: controllerMeta.openMethod
        ? () => invokeMethod(controllerMeta.openMethod)
        : undefined,
      onData: data => invokeMethod(methodMeta, { data }),
      onError: controllerMeta.errorMethod
        ? error => invokeMethod(controllerMeta.errorMethod, { error })
        : undefined,
      onClose: controllerMeta.closeMethod
        ? (closeCode, closeReason) => invokeMethod(controllerMeta.closeMethod, { closeCode, closeReason })
        : undefined,
      logError: (message, error) => this.options.logger.error(message, error),
      logDebug: message => this.options.logger.debug(message),
      isFatalError: error => error instanceof TimerUtil.TimeoutError,
    });
    await session.run();
  }

  private async invokeMethod(
    realObj: WebSocketControllerObject,
    controllerMeta: WebSocketControllerMeta | WebSocketFetchControllerMeta,
    methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta,
    payload: WebSocketMethodPayload<Data, CloseReason>,
  ) {
    const realMethod = (realObj as Record<string, CallableFunction>)[methodMeta.name];
    const args = this.buildMethodArgs(methodMeta, payload);
    const timeout = methodMeta.timeout ?? controllerMeta.timeout;
    try {
      return await TimerUtil.timeout(
        async () => await Reflect.apply(realMethod, realObj, args),
        timeout,
      );
    } catch (error) {
      if (error instanceof TimerUtil.TimeoutError) {
        this.options.logger.error(
          `${controllerMeta.type} ${controllerMeta.controllerName}.${methodMeta.name} timed out after ${timeout}ms`,
          error,
        );
      }
      throw error;
    }
  }

  private buildMethodArgs(
    methodMeta: WebSocketMethodMeta | WebSocketFetchMethodMeta,
    payload: WebSocketMethodPayload<Data, CloseReason>,
  ) {
    const indexes = Array.from(methodMeta.paramMap.keys());
    if (methodMeta.contextParamIndex !== undefined) {
      indexes.push(methodMeta.contextParamIndex);
    }
    const args: unknown[] = new Array(indexes.length ? Math.max(...indexes) + 1 : 0);
    if (methodMeta.contextParamIndex !== undefined) {
      args[methodMeta.contextParamIndex] = this.options.context.context;
    }

    for (const [ index, param ] of methodMeta.paramMap) {
      switch (param.type) {
        case WebSocketParamType.PARAM: {
          const pathParam = param as WebSocketPathParamMeta;
          args[index] = this.options.context.params[pathParam.name];
          break;
        }
        case WebSocketParamType.QUERY: {
          const queryParam = param as WebSocketQueryParamMeta;
          args[index] = this.options.context.query[queryParam.name];
          break;
        }
        case WebSocketParamType.QUERIES: {
          const queryParam = param as WebSocketQueriesParamMeta;
          args[index] = this.options.context.queries[queryParam.name] || [];
          break;
        }
        case WebSocketParamType.HEADERS:
          args[index] = this.options.context.headers;
          break;
        case WebSocketParamType.REQUEST:
          args[index] = this.options.context.request;
          break;
        case WebSocketParamType.SOCKET:
          args[index] = this.options.context.socket;
          break;
        case WebSocketParamType.STREAM:
          assert(payload.getWebSocketStream, '@WebSocketStream can not be used here');
          args[index] = payload.getWebSocketStream();
          break;
        case WebSocketParamType.DATA:
          args[index] = payload.data;
          break;
        case WebSocketParamType.CLOSE:
          args[index] = payload.close;
          break;
        case WebSocketParamType.ERROR:
          args[index] = payload.error;
          break;
        case WebSocketParamType.CLOSE_CODE:
          args[index] = payload.closeCode;
          break;
        case WebSocketParamType.CLOSE_REASON:
          args[index] = payload.closeReason;
          break;
        default:
          assert.fail('never arrive');
      }
    }
    return args;
  }

  private pipeResponseStream(result: unknown, getWebSocketStream: () => Duplex) {
    if (!this.isReadableStream(result)) {
      return;
    }
    pipeline(result, getWebSocketStream(), error => {
      if (!error || this.options.context.socket.readyState >= 2) {
        return;
      }
      this.options.logger.error('WebSocket response stream pipeline failed', error);
      this.options.context.socket.close(WEBSOCKET_INTERNAL_ERROR_CODE, WEBSOCKET_INTERNAL_ERROR_REASON);
    });
  }

  private isReadableStream(result: unknown): result is NodeJS.ReadableStream {
    return !!result && typeof (result as NodeJS.ReadableStream).pipe === 'function';
  }
}
