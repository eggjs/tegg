import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPBody,
  Context,
  HTTPParam,
} from '@eggjs/tegg';
import type { EggContext } from '@eggjs/tegg';
import type { RunCreateDTO } from './types';
import { streamSSE } from './sse-utils';

/**
 * LangGraph Runs Controller
 * 处理 Run 相关的 HTTP 请求
 */
@HTTPController({
  path: '/api',
})
export class RunsController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/runs/:run_id/stream'
  })
  async runsHello(@HTTPParam({ name: 'run_id' }) run_id: string ) {
    return { run_id };
  }
  /**
   * POST /api/runs/stream
   * 流式创建无状态 Run (SSE)
   *
   * 对应 LangGraph runs.mts 的 api.post("/runs/stream", ...) 端点
   */
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/runs/stream',
  })
  async streamStatelessRun(@Context() ctx: EggContext, @HTTPBody() payload: RunCreateDTO) {
    // TODO: 验证 payload
    console.log('streamStatelessRun', payload);
    // const validated = RunCreate.parse(payload);

    // Mock: 生成一个假的 run_id
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 设置 Content-Location header
    ctx.set('Content-Location', `/runs/${runId}`);

    // 类型断言帮助访问 input 中的 messages
    const inputData = payload.input as { messages?: Array<{ role: string; content: string }> } | undefined;

    // 使用 SSE 流式返回
    return streamSSE(ctx, async (stream) => {
      // 如果需要在断开连接时取消，创建 AbortSignal
      // const cancelOnDisconnect = payload.on_disconnect === 'cancel'
      //   ? getDisconnectAbortSignal(ctx, stream)
      //   : undefined;

      try {
        // TODO: 调用 runs service 的 stream.join 方法获取运行结果
        // for await (const { event, data } of runs().stream.join(
        //   runId,
        //   undefined,
        //   {
        //     cancelOnDisconnect,
        //     lastEventId: payload.stream_resumable ? "-1" : undefined,
        //     ignore404: true,
        //   },
        //   auth
        // )) {
        //   await stream.writeSSE({ data: JSON.stringify(data), event });
        // }

        // Mock 实现：模拟 SSE 流式响应
        // 1. 发送 metadata 事件
        await stream.writeSSE({
          event: 'metadata',
          data: JSON.stringify({
            run_id: runId,
            assistant_id: payload.assistant_id || 'mock_assistant',
          }),
        });

        await stream.sleep(100);

        // 2. 发送 values 事件 - 模拟开始处理
        await stream.writeSSE({
          event: 'values',
          data: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: inputData?.messages?.[0]?.content || 'Hello',
              },
            ],
          }),
        });

        await stream.sleep(500);

        // 3. 发送 values 事件 - 模拟 AI 响应
        await stream.writeSSE({
          event: 'values',
          data: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: inputData?.messages?.[0]?.content || 'Hello',
              },
              {
                role: 'assistant',
                content: `Mock response to: ${inputData?.messages?.[0]?.content || 'Hello'}`,
              },
            ],
          }),
        });

        await stream.sleep(200);

        // 4. 发送 end 事件
        await stream.writeSSE({
          event: 'end',
          data: JSON.stringify({
            run_id: runId,
            status: 'completed',
          }),
        });
      } catch (error) {
        console.error('Error streaming run:', error);
        throw error;
      }
    });
  }

}
