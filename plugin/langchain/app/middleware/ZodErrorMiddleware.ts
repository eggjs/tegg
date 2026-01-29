/**
 * Validation Error Middleware
 * 统一处理 Zod 验证错误
 */

import type { EggContext, Next } from '@eggjs/tegg';
import { ZodError } from 'zod';

export async function ZodErrorMiddleware(ctx: EggContext, next: Next): Promise<void> {
  try {
    await next();
  } catch (error) {
    console.log('ZodErrorMiddleware Catch Error', error);
    // 捕获 ZodError 并返回 422 响应
    if (error instanceof ZodError) {
      ctx.status = 422;
      ctx.body = {
        error: 'Validation failed',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      };
      return;
    }

    // 其他错误继续抛出
    throw error;
  }
}
