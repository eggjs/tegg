/**
 * SSE (Server-Sent Events) 流式响应工具
 * 用于实现 LangGraph API 的流式端点
 */

import type { EggContext } from '@eggjs/tegg';

/**
 * SSE 事件格式
 */
export interface SSEEvent {
  id?: string;
  event?: string;
  data: unknown;
}

/**
 * 发送 SSE 事件
 *
 * @param ctx - Egg Context
 * @param event - SSE 事件
 */
export function writeSSE(_ctx: EggContext, event: SSEEvent): void {
  let message = '';

  if (event.id) {
    message += `id: ${event.id}\n`;
  }

  if (event.event) {
    message += `event: ${event.event}\n`;
  }

  // 序列化数据为 JSON
  const data = typeof event.data === 'string'
    ? event.data
    : JSON.stringify(event.data);

  message += `data: ${data}\n\n`;

  // 写入响应流
  // TODO: 需要使用 ctx.res.write() 或类似方法
  // ctx.res.write(message);
}

/**
 * 创建 SSE 流式响应
 *
 * @param ctx - Egg Context
 * @param handler - 流处理函数
 */
export async function streamSSE(
  ctx: EggContext,
  handler: (stream: {
    writeSSE: (event: SSEEvent) => Promise<void>;
  }) => Promise<void>
): Promise<void> {
  // 设置 SSE 响应头
  ctx.set('Content-Type', 'text/event-stream');
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');
  ctx.set('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // TODO: 实现流式响应
  // 1. 获取底层响应对象
  // 2. 创建 writeSSE 方法
  // 3. 调用 handler
  // 4. 处理错误和清理

  const stream = {
    writeSSE: async (event: SSEEvent) => {
      // TODO: 实现
      writeSSE(ctx, event);
    },
  };

  try {
    await handler(stream);
  } catch (error) {
    // 发送错误事件
    stream.writeSSE({
      event: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * 获取断开连接的 AbortSignal
 * 用于在客户端断开连接时取消操作
 *
 * @param ctx - Egg Context
 * @returns AbortSignal
 */
export function getDisconnectAbortSignal(_ctx: EggContext): AbortSignal {
  const controller = new AbortController();

  // 监听请求关闭事件
  // const onClose = () => {
  //   controller.abort();
  // };

  // TODO: 监听 ctx.req 的 close 事件
  // ctx.req.on('close', onClose);

  return controller.signal;
}

/**
 * 序列化数据为字典格式
 * 用于 SSE 数据传输
 *
 * @param data - 要序列化的数据
 * @returns 序列化后的对象
 */
export function serialiseAsDict(data: unknown): Record<string, unknown> {
  if (data === null || data === undefined) {
    return {};
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  // 如果不是对象，包装成对象
  return { value: data };
}
