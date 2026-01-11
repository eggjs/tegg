import assert from 'assert';
import { PassThrough } from 'stream';
import { SSEStreamWriter, streamSSE, getDisconnectAbortSignal, serialiseAsDict } from '../lib/sse';

describe('test/sse-utils.test.ts', () => {
  describe('SSEStreamWriter', () => {
    it('should write SSE event correctly', async () => {
      const passThrough = new PassThrough();
      const writer = new SSEStreamWriter(passThrough);

      let output = '';
      passThrough.on('data', (chunk) => {
        output += chunk.toString();
      });

      await writer.writeSSE({
        event: 'test',
        data: 'hello world',
      });

      writer.close();

      assert(output.includes('event: test'), 'Should include event');
      assert(output.includes('data: hello world'), 'Should include data');
      assert(output.endsWith('\n\n'), 'Should end with double newline');
    });

    it('should write SSE event with id and retry', async () => {
      const passThrough = new PassThrough();
      const writer = new SSEStreamWriter(passThrough);

      let output = '';
      passThrough.on('data', (chunk) => {
        output += chunk.toString();
      });

      await writer.writeSSE({
        event: 'message',
        data: 'test',
        id: '123',
        retry: 5000,
      });

      writer.close();

      assert(output.includes('event: message'));
      assert(output.includes('data: test'));
      assert(output.includes('id: 123'));
      assert(output.includes('retry: 5000'));
    });

    it('should handle multiline data', async () => {
      const passThrough = new PassThrough();
      const writer = new SSEStreamWriter(passThrough);

      let output = '';
      passThrough.on('data', (chunk) => {
        output += chunk.toString();
      });

      await writer.writeSSE({
        data: 'line1\nline2\nline3',
      });

      writer.close();

      assert(output.includes('data: line1'));
      assert(output.includes('data: line2'));
      assert(output.includes('data: line3'));
    });

    it('should write comment', async () => {
      const passThrough = new PassThrough();
      const writer = new SSEStreamWriter(passThrough);

      let output = '';
      passThrough.on('data', (chunk) => {
        output += chunk.toString();
      });

      await writer.writeComment('keep-alive');

      writer.close();

      assert.strictEqual(output, ': keep-alive\n\n');
    });

    it('should sleep for specified time', async () => {
      const writer = new SSEStreamWriter(new PassThrough());

      const start = Date.now();
      await writer.sleep(100);
      const elapsed = Date.now() - start;

      assert(elapsed >= 90, 'Should sleep for at least 90ms');
      assert(elapsed < 200, 'Should not sleep for more than 200ms');
    });

    it('should track closed state', () => {
      const writer = new SSEStreamWriter(new PassThrough());

      assert.strictEqual(writer.isClosed(), false, 'Should not be closed initially');

      writer.close();

      assert.strictEqual(writer.isClosed(), true, 'Should be closed after close()');
    });

    it('should throw error when writing to closed stream', async () => {
      const writer = new SSEStreamWriter(new PassThrough());

      writer.close();

      await assert.rejects(
        async () => {
          await writer.writeSSE({ data: 'test' });
        },
        { message: 'Stream is closed' }
      );
    });

    it('should throw error when writing comment to closed stream', async () => {
      const writer = new SSEStreamWriter(new PassThrough());

      writer.close();

      await assert.rejects(
        async () => {
          await writer.writeComment('test');
        },
        { message: 'Stream is closed' }
      );
    });
  });

  describe('streamSSE', () => {
    it('should set correct SSE headers', async () => {
      const ctx: any = {
        set: (key: string, value: string) => {
          ctx.headers = ctx.headers || {};
          ctx.headers[key.toLowerCase()] = value;
        },
        headers: {},
      };

      streamSSE(ctx, async (stream) => {
        await stream.writeSSE({ data: 'test' });
      });

      // 等待一下让 streamSSE 设置 headers
      await new Promise(resolve => setTimeout(resolve, 10));

      assert.strictEqual(ctx.headers['content-type'], 'text/event-stream');
      assert.strictEqual(ctx.headers['cache-control'], 'no-cache');
      assert.strictEqual(ctx.headers['connection'], 'keep-alive');
      assert.strictEqual(ctx.headers['transfer-encoding'], 'chunked');
      assert.strictEqual(ctx.headers['x-accel-buffering'], 'no');
    });

    it('should call callback with stream writer', async () => {
      const ctx: any = {
        set: () => {},
      };

      let streamReceived = false;

      streamSSE(ctx, async (stream) => {
        streamReceived = true;
        assert(stream.writeSSE, 'Stream should have writeSSE method');
        assert(stream.sleep, 'Stream should have sleep method');
        assert(stream.close, 'Stream should have close method');
      });

      // 等待回调执行
      await new Promise(resolve => setTimeout(resolve, 10));

      assert(streamReceived, 'Callback should be called');
    });

    it('should handle errors in callback', async () => {
      const ctx: any = {
        set: () => {},
      };

      const error = new Error('Test error');
      let errorReceived = false;

      await streamSSE(ctx, async () => {
        throw error;
      }, async (e) => {
        errorReceived = true;
        assert.strictEqual(e, error);
      });

      // 等待错误处理
      await new Promise(resolve => setTimeout(resolve, 10));

      assert(errorReceived, 'Error handler should be called');
    });
  });

  describe('getDisconnectAbortSignal', () => {
    it('should return an AbortSignal', () => {
      const ctx: any = {
        req: {
          on: () => {},
          off: () => {},
        },
      };

      const signal = getDisconnectAbortSignal(ctx);

      assert(signal instanceof AbortSignal, 'Should return an AbortSignal');
      assert.strictEqual(signal.aborted, false, 'Should not be aborted initially');
    });

    it('should abort when request closes', (done) => {
      let closeHandler: Function;
      const ctx: any = {
        req: {
          on: (event: string, handler: Function) => {
            if (event === 'close') {
              closeHandler = handler;
            }
          },
          off: () => {},
        },
      };

      const signal = getDisconnectAbortSignal(ctx);

      signal.addEventListener('abort', () => {
        assert.strictEqual(signal.aborted, true);
        done();
      });

      // 模拟请求关闭
      closeHandler!();
    });

    it('should close stream when request closes', (done) => {
      let closeHandler: Function;
      const ctx: any = {
        req: {
          on: (event: string, handler: Function) => {
            if (event === 'close') {
              closeHandler = handler;
            }
          },
          off: () => {},
        },
      };

      const stream = new SSEStreamWriter(new PassThrough());

      getDisconnectAbortSignal(ctx, stream);

      // 模拟请求关闭
      closeHandler!();

      // 稍等一下确保流已关闭
      setTimeout(() => {
        assert.strictEqual(stream.isClosed(), true);
        done();
      }, 10);
    });
  });

  describe('serialiseAsDict', () => {
    it('should return empty object for null', () => {
      const result = serialiseAsDict(null);
      assert.deepStrictEqual(result, {});
    });

    it('should return empty object for undefined', () => {
      const result = serialiseAsDict(undefined);
      assert.deepStrictEqual(result, {});
    });

    it('should return object as-is', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      const result = serialiseAsDict(obj);
      assert.deepStrictEqual(result, obj);
    });

    it('should wrap non-object values', () => {
      assert.deepStrictEqual(serialiseAsDict('string'), { value: 'string' });
      assert.deepStrictEqual(serialiseAsDict(123), { value: 123 });
      assert.deepStrictEqual(serialiseAsDict(true), { value: true });
    });

    it('should wrap array values', () => {
      const arr = [1, 2, 3];
      const result = serialiseAsDict(arr);
      assert.deepStrictEqual(result, { value: arr });
    });
  });
});
