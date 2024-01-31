import assert from 'assert';
import pathToRegexp from 'path-to-regexp';
import { MethodMeta } from './MethodMeta';
import { HTTPMethodEnum, HTTPParamType, MiddlewareFunc } from './types';

export abstract class ParamMeta {
  type: HTTPParamType;

  abstract validate(httpPath: string);
}
export class RequestParamMeta extends ParamMeta {
  type = HTTPParamType.REQUEST;

  validate() {
    return;
  }
}

export class BodyParamMeta extends ParamMeta {
  type = HTTPParamType.BODY;

  validate() {
    return;
  }
}

export class QueryParamMeta extends ParamMeta {
  type = HTTPParamType.QUERY;
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  validate() {
    return;
  }
}

export class QueriesParamMeta extends ParamMeta {
  type = HTTPParamType.QUERIES;
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  validate() {
    return;
  }
}

export class PathParamMeta extends ParamMeta {
  type = HTTPParamType.PARAM;
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  validate(httpPath: string) {
    const names: pathToRegexp.Key[] = [];
    pathToRegexp(httpPath, names);
    if (!names.find(name => String(name.name) === this.name)) {
      throw new Error(`can not find param ${this.name} in path ${httpPath}`);
    }
  }
}

export class HTTPMethodMeta implements MethodMeta {
  public readonly name: string;
  public readonly path: string;
  public readonly method: HTTPMethodEnum;
  public readonly middlewares: readonly MiddlewareFunc[];
  public readonly contextParamIndex: number | undefined;
  public readonly paramMap: Map<number, ParamMeta>;
  public readonly priority: number;
  public readonly needAcl: boolean;
  public readonly aclCode: string | undefined;
  public readonly hosts: string[] | undefined;

  constructor(
    name: string,
    path: string,
    method: HTTPMethodEnum,
    middlewares: MiddlewareFunc[],
    contextParamIndex: number | undefined,
    paramTypeMap: Map<number, ParamMeta>,
    priority: number,
    needAcl: boolean,
    aclCode: string | undefined,
    hosts: string[] | undefined,
  ) {
    this.name = name;
    this.path = path;
    this.method = method;
    this.middlewares = middlewares;
    this.contextParamIndex = contextParamIndex;
    this.paramMap = paramTypeMap;
    this.priority = priority;
    this.needAcl = needAcl;
    this.aclCode = aclCode;
    this.hosts = hosts;
  }
}

export class ParamMetaUtil {
  static createParam(type: HTTPParamType, name?: string) {
    switch (type) {
      case HTTPParamType.PARAM: {
        assert(name, 'path param must has name');
        return new PathParamMeta(name!);
      }
      case HTTPParamType.BODY: {
        return new BodyParamMeta();
      }
      case HTTPParamType.QUERIES: {
        assert(name, 'queries param must has name');
        return new QueriesParamMeta(name!);
      }
      case HTTPParamType.QUERY: {
        assert(name, 'query param must has name');
        return new QueryParamMeta(name!);
      }
      case HTTPParamType.REQUEST: {
        return new RequestParamMeta();
      }
      default:
        assert.fail('never arrive');
    }
  }
}
