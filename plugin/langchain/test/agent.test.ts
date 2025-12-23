import mm from 'egg-mock';
import path from 'path';
import assert from 'assert';

describe.only('plugin/langchain/test/agent.test.ts', () => {
  // https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain/package.json#L9
  if (parseInt(process.version.slice(1, 3)) > 19) {
    let app;
    
    afterEach(() => {
      mm.restore();
    });

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '..');
      });
      app = mm.app({
        baseDir: path.join(__dirname, 'fixtures/apps/agent'),
        framework: path.dirname(require.resolve('egg')),
      });
      await app.ready();
    });

    after(async () => {
      await app.close();
    });

    it('should return SSE stream by run_id', async () => {
      const res = await app.httpRequest()
        .get('/api/runs/112233/stream')
        .expect(200);

      assert.deepStrictEqual(res.body, { run_id: '112233' });
    });
  
    it('should return SSE stream', async () => {
      app.mockCsrf();
      const res = await app.httpRequest()
        .post('/api/runs/stream')
        .send({
          assistant_id: 'test-assistant-id',
          input: {
            messages: [
              {
                role: 'human',
                content: 'hello',
              },
            ],
          },
        })
        .expect(200);

      // 验证 SSE 响应头
      assert.strictEqual(res.headers['content-type'], 'text/event-stream');
      assert.strictEqual(res.headers['cache-control'], 'no-cache');
      assert.strictEqual(res.headers['connection'], 'keep-alive');

      // 验证 Content-Location header 存在
      assert(res.headers['content-location'], 'Content-Location header should exist');
      assert(res.headers['content-location'].startsWith('/runs/'), 'Content-Location should point to a run');
    });

        // it('should accept valid RunCreateDTO payload', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     stream_mode: 'values',
        //     multitask_strategy: 'reject',
        //     on_disconnect: 'continue',
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should handle array stream_mode', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     stream_mode: ['values', 'updates', 'events'],
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept checkpoint configuration', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     checkpoint_id: 'checkpoint-123',
        //     checkpoint: {
        //       checkpoint_id: 'checkpoint-123',
        //       checkpoint_ns: 'default',
        //     },
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept config with metadata', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     config: {
        //       tags: ['test', 'stream'],
        //       recursion_limit: 10,
        //       configurable: {
        //         thread_id: 'thread-123',
        //       },
        //     },
        //     metadata: {
        //       user: 'test-user',
        //       session_id: 'session-123',
        //     },
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should handle interrupt_before configuration', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     interrupt_before: ['step1', 'step2'],
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should handle interrupt_after configuration', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     interrupt_after: '*',
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept langsmith_tracer configuration', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     langsmith_tracer: {
        //       project_name: 'test-project',
        //       example_id: 'example-123',
        //     },
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept command payload', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     command: {
        //       goto: 'step1',
        //       update: { key: 'value' },
        //     },
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept on_disconnect = cancel', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     on_disconnect: 'cancel',
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept stream_subgraphs option', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     stream_subgraphs: true,
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // it('should accept stream_resumable option', async () => {
        //   const payload = {
        //     assistant_id: 'test-assistant-id',
        //     input: {
        //       messages: [
        //         {
        //           role: 'human',
        //           content: 'test',
        //         },
        //       ],
        //     },
        //     stream_resumable: true,
        //   };

        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(200);
        // });

        // TODO: Add validation tests when schema validation is implemented
        // it('should reject invalid assistant_id', async () => {
        //   const payload = {
        //     assistant_id: 'invalid',
        //     input: { message: 'test' },
        //   };
        //
        //   await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send(payload)
        //     .expect(422);
        // });

        // TODO: Add tests for actual SSE stream content when service is implemented
        // it('should stream events in SSE format', async () => {
        //   const res = await app.httpRequest()
        //     .post('/api/runs/stream')
        //     .send({
        //       assistant_id: 'test-assistant-id',
        //       input: { message: 'test' },
        //     });
        //
        //   // Parse SSE response
        //   const events = parseSSE(res.text);
        //   assert(events.length > 0, 'Should receive at least one SSE event');
        // });
      // });

      // TODO: Add tests for other endpoints when implemented
      // describe('POST /api/runs/wait', () => {});
      // describe('POST /api/runs', () => {});
      // describe('POST /api/runs/batch', () => {});
    // });
  }
});
