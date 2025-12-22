import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPBody,
  Context,
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
  /**
   * POST /api/runs/stream
   * 流式创建无状态 Run (SSE)
   */
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/runs/stream',
  })
  async streamStatelessRun(@HTTPBody() _payload: RunCreateDTO, @Context() ctx: EggContext) {
    // TODO: 验证 payload
    // const validated = RunCreate.parse(payload);

    // TODO: 创建 run
    // const run = await this.createValidRun(undefined, payload);
    const mockRunId = 'mock-run-id'; // 临时 mock

    // TODO: 设置 Content-Location header
    ctx.set('Content-Location', `/runs/${mockRunId}`);

    // 实现 SSE 流式响应
    await streamSSE(ctx, async (stream) => {
      // TODO: 获取 cancelOnDisconnect signal
      // const cancelOnDisconnect = payload.on_disconnect === 'cancel'
      //   ? getDisconnectAbortSignal(ctx)
      //   : undefined;

      try {
        // TODO: 加入 run stream
        // for await (const { event, data } of runsService.stream.join(
        //   mockRunId,
        //   undefined,
        //   { cancelOnDisconnect, lastEventId: run.kwargs.resumable ? '-1' : undefined, ignore404: true },
        //   auth
        // )) {
        //   await stream.writeSSE({ event, data: serialiseAsDict(data) });
        // }

        // 临时发送一个测试事件
        await stream.writeSSE({
          event: 'metadata',
          data: { message: 'SSE stream endpoint created (not implemented yet)' },
        });
      } catch (error) {
        // 错误处理
        console.error('Error streaming run:', error);
      }
    });
  }

  // /**
  //  * 创建有效的 Run 实例
  //  * 从 runs.mts 的 createValidRun 函数迁移而来
  //  *
  //  * @param _threadId - 线程 ID (可选，无状态 run 传 undefined)
  //  * @param _payload - Run 创建参数
  //  * @returns Run 实例
  //  */
  // private async createValidRun(
  //   _threadId: string | undefined,
  //   _payload: RunCreateDTO
  // ) {
  //   // TODO: 实现 createValidRun 逻辑
  //   // 1. 生成 runId (uuid)
  //   // 2. 处理 stream_mode (默认 "values")
  //   // 3. 处理 multitask_strategy (默认 "reject")
  //   // 4. 构建 config 对象
  //   // 5. 处理 checkpoint_id/checkpoint
  //   // 6. 处理 langsmith_tracer
  //   // 7. 处理 headers (x-* 和 user-agent)
  //   // 8. 处理 auth 信息
  //   // 9. 处理 feedback_keys
  //   // 10. 调用 runs service 创建运行
  //   // 11. 处理 multitask 策略 (interrupt/rollback)

  //   throw new Error('createValidRun not implemented yet');
  // }
}
