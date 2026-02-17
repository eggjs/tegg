import {
  defaultGetApp,
} from './shared';
import type { TeggVitestAdapterOptions } from './shared';

export type { EggMockApp, TeggVitestAdapterOptions } from './shared';

/**
 * Configure the custom Vitest runner (used via globalThis.__teggVitestConfig).
 * Call this in a setupFile and set `runner` in vitest.config.ts to use the runner approach.
 */
export function configureTeggRunner(options: TeggVitestAdapterOptions = {}) {
  (globalThis as any).__teggVitestConfig = {
    restoreMocks: options.restoreMocks ?? true,
    getApp: options.getApp ?? defaultGetApp,
  };
}
