import type { AsyncLocalStorage } from 'node:async_hooks';
import type { Application } from 'egg';

export type EggMockApp = Application & {
  // egg-mock ctx API
  ctxStorage?: {
    getStore?: () => any;
    enterWith?: (store: any) => void;
  } & AsyncLocalStorage<any>;

  mockContext?: (data?: any, options?: any) => any;
};

export interface TeggVitestAdapterOptions {
  /**
   * Resolve app instance.
   * Default: require('egg-mock/bootstrap').app
   */
  getApp?: () => Promise<EggMockApp | undefined> | EggMockApp | undefined;

  /**
   * Restore mocks after each test.
   * Default: true (calls egg-mock.restore())
   */
  restoreMocks?: boolean;
}

export const DEBUG_ENABLED = process.env.DEBUG_TEGG_VITEST_ADAPTER === '1';

export function debugLog(message: string, extra?: unknown) {
  if (!DEBUG_ENABLED) return;
  if (extra === undefined) {
    // eslint-disable-next-line no-console
    console.log(`[tegg-vitest-adapter] ${message}`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[tegg-vitest-adapter] ${message}`, extra);
}

export async function defaultGetApp(): Promise<EggMockApp | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bootstrap = require('egg-mock/bootstrap');
  return bootstrap?.app;
}

export async function restoreEggMocksIfNeeded(restoreMocks: boolean) {
  if (!restoreMocks) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const eggMock = require('egg-mock');
  const mm = eggMock?.default || eggMock;
  if (mm?.restore) {
    await mm.restore();
  }
}
