/**
 * SSE (Server-Sent Events) 流式响应工具
 * 用于实现 LangGraph API 的流式端点
 */

import type { EggContext } from '@eggjs/tegg';
import { PassThrough } from 'stream';

/**
 * SSE 事件格式
 * 对应 Hono 的 SSEMessage 接口
 */
export interface SSEEvent {
  data: string | Promise<string>;
  event?: string;
  id?: string;
  retry?: number;
}

/**
 * SSE Stream 类
 * 提供类似 Hono 的 streamSSE API
 */
export class SSEStreamWriter {
  private writable: NodeJS.WritableStream;
  private closed = false;

  constructor(writable: NodeJS.WritableStream) {
    this.writable = writable;
  }

  /**
   * 写入 SSE 事件
   * 参考 Hono 的 writeSSE 实现
   */
  async writeSSE(message: SSEEvent): Promise<void> {
    if (this.closed) {
      throw new Error('Stream is closed');
    }

    // 等待 data（支持 Promise）
    const data = await Promise.resolve(message.data);

    // 将数据转换为字符串（如果不是字符串则 JSON 序列化）
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // 处理多行数据
    const dataLines = dataString
      .split('\n')
      .map((line) => `data: ${line}`)
      .join('\n');

    // 按照 Hono 的顺序组装 SSE 消息：event -> data -> id -> retry
    const sseData = [
      message.event && `event: ${message.event}`,
      dataLines,
      message.id && `id: ${message.id}`,
      message.retry && `retry: ${message.retry}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n\n';

    return new Promise<void>((resolve, reject) => {
      this.writable.write(sseData, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 发送注释（用于保持连接）
   */
  async writeComment(comment: string): Promise<void> {
    if (this.closed) {
      throw new Error('Stream is closed');
    }

    return new Promise<void>((resolve, reject) => {
      this.writable.write(`: ${comment}\n\n`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 睡眠指定时间（毫秒）
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 关闭流
   */
  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.writable.end();
    }
  }

  /**
   * 检查流是否已关闭
   */
  isClosed(): boolean {
    return this.closed;
  }
}

/**
 * 创建 SSE 流式响应
 * 参考 Hono 的 streamSSE API
 *
 * @param ctx - Egg Context
 * @param cb - 流处理回调函数
 * @param onError - 可选的错误处理回调
 *
 * @example
 * ```ts
 * return streamSSE(ctx, async (stream) => {
 *   await stream.writeSSE({
 *     data: 'hello',
 *     event: 'message',
 *     id: '1'
 *   });
 *   await stream.sleep(1000);
 *   await stream.writeSSE({ data: 'world' });
 * });
 * ```
 */
export async function streamSSE(
  ctx: EggContext,
  cb: (stream: SSEStreamWriter) => Promise<void>,
  onError?: (e: Error, stream: SSEStreamWriter) => Promise<void>
): Promise<void> {
  // 设置 SSE 响应头（按照 Hono 的顺序）
  ctx.set('Transfer-Encoding', 'chunked');
  ctx.set('Content-Type', 'text/event-stream');
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');
  ctx.set('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // 创建 PassThrough 流（既可读又可写）
  const passThrough = new PassThrough();

  // 设置响应体为流
  ctx.body = passThrough;
  ctx.status = 200;

  // 创建 SSEStreamWriter 实例
  const stream = new SSEStreamWriter(passThrough);

  // 执行流处理逻辑（参考 Hono 的 run 函数）
  const runStream = async () => {
    try {
      await cb(stream);
    } catch (e) {
      if (e instanceof Error && onError) {
        // 调用自定义错误处理
        await onError(e, stream);
      }

      // 发送错误事件
      if (!stream.isClosed()) {
        try {
          await stream.writeSSE({
            event: 'error',
            data: e instanceof Error ? e.message : String(e),
          });
        } catch (writeError) {
          console.error('Failed to write error event:', writeError);
        }
      }

      // 如果没有自定义错误处理，输出到控制台
      if (!onError) {
        console.error(e);
      }
    } finally {
      // 关闭流
      stream.close();
    }
  };

  // 启动流处理（不阻塞）
  runStream();
}

/**
 * 获取断开连接的 AbortSignal
 * 用于在客户端断开连接时取消操作
 *
 * @param ctx - Egg Context
 * @param stream - SSE Stream Writer (可选，用于清理)
 * @returns AbortSignal
 */
export function getDisconnectAbortSignal(
  ctx: EggContext,
  stream?: SSEStreamWriter
): AbortSignal {
  const controller = new AbortController();

  // 监听请求关闭事件
  const onClose = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
    if (stream && !stream.isClosed()) {
      stream.close();
    }
  };

  // 监听底层连接关闭
  ctx.req.on('close', onClose);
  ctx.req.on('error', onClose);

  // 清理监听器（可选）
  const cleanup = () => {
    ctx.req.off('close', onClose);
    ctx.req.off('error', onClose);
  };

  // 在 abort 时清理
  controller.signal.addEventListener('abort', cleanup, { once: true });

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
