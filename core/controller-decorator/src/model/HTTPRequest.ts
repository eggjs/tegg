import undici from 'undici';
// https://github.com/nodejs/undici/blob/main/index.js#L118
// 只有 nodejs >= 16 才支持 Request
export class HTTPRequest extends (undici.Request || Object) {}
