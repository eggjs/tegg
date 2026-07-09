import { HTTPMethodEnum, HTTPController, HTTPMethod, HTTPQuery } from '@eggjs/tegg';

@HTTPController()
export class GetController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/hello' })
  async hello() {
    return 'hello';
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/null-body' })
  async nullBody(@HTTPQuery() nil: string) {
    return nil ? null : undefined;
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/response' })
  async response() {
    return new Response('full response', {
      status: 500,
      headers: {
        'content-type': 'text/plain',
        'x-custom-header': 'custom-value',
      },
    });
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/sse' })
  async sse(@HTTPQuery() id: string) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ id })}\n\n`));
        controller.enqueue(encoder.encode('event: done\ndata: ok\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  }
}
