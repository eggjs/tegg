import { createServer, IncomingMessage, OutgoingHttpHeaders, Server, ServerOptions, ServerResponse } from 'node:http';
import { Duplex, pipeline } from 'node:stream';
import { Headers, BodyInit, Request, Response } from 'undici';
import { FetchEvent, WebSocketUpgradeEvent } from '@eggjs/tegg-types/standalone';

export type FetchEventListener = (event: FetchEvent) => Promise<Response>;
export type WebSocketUpgradeEventListener = (event: WebSocketUpgradeEvent) => Promise<void>;
export type ServiceWorkerEvent = FetchEvent | WebSocketUpgradeEvent;
export type ServiceWorkerEventListener = FetchEventListener | WebSocketUpgradeEventListener | ((event: ServiceWorkerEvent) => Promise<Response | void>);

export interface StartHTTPServerOptions extends ServerOptions {
  listener: ServiceWorkerEventListener;
}

export class StandaloneTestUtil {
  static skipOnNode(minVersion = 18) {
    const version = parseInt(process.versions.node.split('.')[0], 10);
    return version < minVersion;
  }

  static #buildRequest(req: IncomingMessage): Request {
    const origin = `http://${req.headers.host ?? 'localhost'}`;
    const url = new URL(req.url ?? '', origin);

    const body: BodyInit | null = req.method === 'GET' || req.method === 'HEAD' ? null : req;

    req.headers.host = url.host;

    const headers = new Headers();
    for (const [ name, values ] of Object.entries(req.headers)) {
      if (Array.isArray(values)) {
        for (const value of values) {
          headers.append(name, value);
        }
      } else if (values !== undefined) {
        headers.append(name, values);
      }
    }

    return new Request(url, {
      method: req.method,
      headers,
      body,
      duplex: body ? 'half' : undefined,
    });
  }

  static #createHTTPServerListener(listener: ServiceWorkerEventListener) {
    return async (req: IncomingMessage, res: ServerResponse) => {
      const request = StandaloneTestUtil.#buildRequest(req);
      // TODO currently fake FetchEvent
      const event: any = new Event('fetch');
      event.request = request;
      const response = await (listener as FetchEventListener)(event);
      if (!response) {
        res.writeHead(500);
        res.end();
        return;
      }

      const headers: OutgoingHttpHeaders = {};
      for (const [ key, value ] of response.headers) {
        headers[key.toLowerCase()] = value;
      }

      res.writeHead(response.status, headers);

      if (!response.body) {
        res.end();
        return;
      }
      pipeline(response.body, res, e => {
        if (e) {
          console.error(`pipeline writing response error for url ${response.url}`, e);
          res.end();
        }
      });
    };
  }

  static #createWebSocketUpgradeListener(listener: ServiceWorkerEventListener) {
    return async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const event: any = new Event('websocket');
      event.request = req;
      event.socket = socket;
      event.head = head;

      try {
        await listener(event);
      } catch (error) {
        if (!socket.destroyed) {
          const message = 'Internal Server Error';
          socket.write(`HTTP/1.1 500 ${message}\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
          socket.destroy();
        }
        console.error('websocket upgrade listener failed:', error);
      }
    };
  }

  static startHTTPServer(host: string, port: number, { listener, ...options }: StartHTTPServerOptions) {
    const serverListener = StandaloneTestUtil.#createHTTPServerListener(listener);
    const server = createServer(options ?? {}, serverListener);
    server.on('upgrade', StandaloneTestUtil.#createWebSocketUpgradeListener(listener));

    return new Promise<Server>(resolve => {
      server.listen(port, host, () => resolve(server));
    });
  }
}
