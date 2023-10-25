import type{ Context } from 'egg';
export class FetchRequest {
  #request;
  constructor(ctx:Context) {
    this.#request = ctx.request;
  }
  get headers(): any {
    return this.#request.headers;
  }
  get body(): any {
    return this.#request.body;
  }
  get method(): string {
    return this.#request.method;
  }
  get mode(): string {
    return this.#request.mode;
  }
  get redirect(): any {
    return this.#request.redirect;
  }
  get url(): any {
    return this.#request.url;
  }
  get cache(): any {
    return this.#request.cache;
  }
  get credentials(): any {
    return this.#request.credentials;
  }
  get integrity(): any {
    return this.#request.integrity;
  }
}
