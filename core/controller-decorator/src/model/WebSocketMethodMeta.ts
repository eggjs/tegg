import assert from 'node:assert';
import pathToRegexp from 'path-to-regexp';
import { WebSocketParamType } from '@eggjs/tegg-types';
import type { MethodMeta, MiddlewareFunc } from '@eggjs/tegg-types';

export abstract class WebSocketParamMeta {
  type: WebSocketParamType;

  abstract validate(webSocketPath: string);
}

export class WebSocketPathParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.PARAM;
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  validate(webSocketPath: string) {
    const names: pathToRegexp.Key[] = [];
    pathToRegexp(webSocketPath, names);
    if (!names.find(name => String(name.name) === this.name)) {
      throw new Error(`can not find param ${this.name} in path ${webSocketPath}`);
    }
  }
}

export class WebSocketQueryParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.QUERY;
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  validate() {
    return;
  }
}

export class WebSocketQueriesParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.QUERIES;
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  validate() {
    return;
  }
}

export class WebSocketHeadersParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.HEADERS;

  validate() {
    return;
  }
}

export class WebSocketRequestParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.REQUEST;

  validate() {
    return;
  }
}

export class WebSocketSocketParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.SOCKET;

  validate() {
    return;
  }
}

export class WebSocketStreamParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.STREAM;

  validate() {
    return;
  }
}

export class WebSocketDataParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.DATA;

  validate() {
    return;
  }
}

export class WebSocketCloseParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.CLOSE;

  validate() {
    return;
  }
}

export class WebSocketErrorParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.ERROR;

  validate() {
    return;
  }
}

export class WebSocketCloseCodeParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.CLOSE_CODE;

  validate() {
    return;
  }
}

export class WebSocketCloseReasonParamMeta extends WebSocketParamMeta {
  type = WebSocketParamType.CLOSE_REASON;

  validate() {
    return;
  }
}

export class WebSocketMethodMeta implements MethodMeta {
  public readonly name: string;
  public readonly path: string;
  public readonly middlewares: readonly MiddlewareFunc[];
  public readonly contextParamIndex: number | undefined;
  public readonly paramMap: Map<number, WebSocketParamMeta>;
  public readonly priority: number;
  public readonly hosts: string[] | undefined;

  constructor(
    name: string,
    path: string,
    middlewares: MiddlewareFunc[],
    contextParamIndex: number | undefined,
    paramMap: Map<number, WebSocketParamMeta>,
    priority: number,
    hosts: string[] | undefined,
  ) {
    this.name = name;
    this.path = path;
    this.middlewares = middlewares;
    this.contextParamIndex = contextParamIndex;
    this.paramMap = paramMap;
    this.priority = priority;
    this.hosts = hosts;
  }
}

export class WebSocketParamMetaUtil {
  static createParam(type: WebSocketParamType, name?: string) {
    switch (type) {
      case WebSocketParamType.PARAM: {
        assert(name, 'websocket path param must has name');
        return new WebSocketPathParamMeta(name!);
      }
      case WebSocketParamType.QUERY: {
        assert(name, 'websocket query param must has name');
        return new WebSocketQueryParamMeta(name!);
      }
      case WebSocketParamType.QUERIES: {
        assert(name, 'websocket queries param must has name');
        return new WebSocketQueriesParamMeta(name!);
      }
      case WebSocketParamType.HEADERS: {
        return new WebSocketHeadersParamMeta();
      }
      case WebSocketParamType.REQUEST: {
        return new WebSocketRequestParamMeta();
      }
      case WebSocketParamType.SOCKET: {
        return new WebSocketSocketParamMeta();
      }
      case WebSocketParamType.STREAM: {
        return new WebSocketStreamParamMeta();
      }
      case WebSocketParamType.DATA: {
        return new WebSocketDataParamMeta();
      }
      case WebSocketParamType.CLOSE: {
        return new WebSocketCloseParamMeta();
      }
      case WebSocketParamType.ERROR: {
        return new WebSocketErrorParamMeta();
      }
      case WebSocketParamType.CLOSE_CODE: {
        return new WebSocketCloseCodeParamMeta();
      }
      case WebSocketParamType.CLOSE_REASON: {
        return new WebSocketCloseReasonParamMeta();
      }
      default:
        assert.fail('never arrive');
    }
  }
}
