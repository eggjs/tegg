import pathToRegexp from 'path-to-regexp';
import {
  ControllerType,
  WebSocketControllerMeta,
  WebSocketFetchControllerMeta,
  WebSocketFetchMethodMeta,
  WebSocketMethodMeta,
} from '@eggjs/controller-decorator';

export type WebSocketControllerMetadata = WebSocketControllerMeta | WebSocketFetchControllerMeta;
export type WebSocketRouteMethodMeta = WebSocketMethodMeta | WebSocketFetchMethodMeta;

export interface WebSocketRoute<ControllerProto> {
  controllerProto: ControllerProto;
  controllerMeta: WebSocketControllerMetadata;
  methodMeta: WebSocketRouteMethodMeta;
  methodRealPath: string;
  methodName: string;
  host?: string;
  keys: pathToRegexp.Key[];
  regexp: RegExp;
}

export function createWebSocketRoutes<ControllerProto>(
  controllerProtos: ControllerProto[],
  getMetadata: (proto: ControllerProto) => WebSocketControllerMetadata,
  validateMethod: (controllerMeta: WebSocketControllerMetadata, methodMeta: WebSocketRouteMethodMeta) => void,
): Array<WebSocketRoute<ControllerProto>> {
  const methodMap = new Map<WebSocketRouteMethodMeta, ControllerProto>();
  for (const proto of controllerProtos) {
    for (const method of getMetadata(proto).methods) {
      methodMap.set(method, proto);
    }
  }
  const methods = Array.from(methodMap.keys()).sort((a, b) => b.priority - a.priority);

  for (const method of methods) {
    const controllerMeta = getMetadata(methodMap.get(method)!);
    validateMethod(controllerMeta, method);
  }

  return methods.flatMap(method => {
    const controllerProto = methodMap.get(method)!;
    const controllerMeta = getMetadata(controllerProto);
    const methodHosts = getWebSocketMethodHosts(controllerMeta, method);
    const hosts = methodHosts?.length ? methodHosts : [ undefined ];
    return hosts.map(host => createRoute(controllerProto, controllerMeta, method, host));
  });
}

export function matchWebSocketRoute<ControllerProto>(
  routes: Array<WebSocketRoute<ControllerProto>>,
  pathname: string,
  host: string | undefined,
): { route: WebSocketRoute<ControllerProto>; params: Record<string, string> } | undefined {
  for (const route of routes) {
    if (route.host && !matchWebSocketHost(route.host, host)) {
      continue;
    }
    const matched = route.regexp.exec(pathname);
    if (!matched) {
      continue;
    }
    const params: Record<string, string> = {};
    route.keys.forEach((key, index) => {
      const value = matched[index + 1];
      if (value !== undefined) {
        params[String(key.name)] = decodeURIComponent(value);
      }
    });
    return { route, params };
  }
}

export function getWebSocketMethodRealPath(
  controllerMeta: WebSocketControllerMetadata,
  methodMeta: WebSocketRouteMethodMeta,
) {
  if (controllerMeta.type === ControllerType.WEBSOCKET) {
    return controllerMeta.getMethodRealPath(methodMeta as WebSocketMethodMeta);
  }
  return controllerMeta.getMethodRealPath(methodMeta as WebSocketFetchMethodMeta);
}

export function getWebSocketMethodHosts(
  controllerMeta: WebSocketControllerMetadata,
  methodMeta: WebSocketRouteMethodMeta,
): string[] | undefined {
  if (controllerMeta.type === ControllerType.WEBSOCKET) {
    return controllerMeta.getMethodHosts(methodMeta as WebSocketMethodMeta);
  }
  return controllerMeta.getMethodHosts(methodMeta as WebSocketFetchMethodMeta);
}

export function getWebSocketMethodName(
  controllerMeta: WebSocketControllerMetadata,
  methodMeta: WebSocketRouteMethodMeta,
): string {
  if (controllerMeta.type === ControllerType.WEBSOCKET) {
    return controllerMeta.getMethodName(methodMeta as WebSocketMethodMeta);
  }
  return controllerMeta.getMethodName(methodMeta as WebSocketFetchMethodMeta);
}

export function getWebSocketMethodMiddlewares(
  controllerMeta: WebSocketControllerMetadata,
  methodMeta: WebSocketRouteMethodMeta,
) {
  if (controllerMeta.type === ControllerType.WEBSOCKET) {
    return controllerMeta.getMethodMiddlewares(methodMeta as WebSocketMethodMeta);
  }
  return controllerMeta.getMethodMiddlewares(methodMeta as WebSocketFetchMethodMeta);
}

function createRoute<ControllerProto>(
  controllerProto: ControllerProto,
  controllerMeta: WebSocketControllerMetadata,
  methodMeta: WebSocketRouteMethodMeta,
  host: string | undefined,
): WebSocketRoute<ControllerProto> {
  const methodRealPath = getWebSocketMethodRealPath(controllerMeta, methodMeta);
  const keys: pathToRegexp.Key[] = [];
  return {
    controllerProto,
    controllerMeta,
    methodMeta,
    methodRealPath,
    methodName: getWebSocketMethodName(controllerMeta, methodMeta),
    host,
    keys,
    regexp: pathToRegexp(methodRealPath, keys, { sensitive: true }),
  };
}

function matchWebSocketHost(expectedHost: string, requestHost: string | undefined) {
  if (!requestHost) {
    return false;
  }
  return requestHost === expectedHost || requestHost.split(':')[0] === expectedHost;
}
