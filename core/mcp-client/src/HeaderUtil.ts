import { Headers } from 'urllib';

export function mergeHeaders(...headersInits: Array<HeadersInit | undefined>): HeadersInit {
  const res = {};
  for (const headersInit of headersInits) {
    if (!headersInit) continue;
    const headers = new Headers(headersInit);
    for (const key of headers.keys()) {
      res[key] = headers.get(key);
    }
  }
  return res;
}
