export class ResponseUtils {
  static createResponseByBody(body: any) {
    if (typeof body === 'undefined' || body === null) {
      return new Response(null, { status: 204 });
    }
    if (Buffer.isBuffer(body) || typeof body === 'string' || body instanceof ReadableStream) {
      return new Response(body, { status: 200 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
