import type { ModuleConfig, ModuleConfigHolder } from '@eggjs/tegg-types';

export class ModuleConfigs {
  constructor(readonly inner: Record<string, ModuleConfigHolder>) {
  }

  get(moduleName: string): ModuleConfig | undefined {
    return this.inner[moduleName]?.config;
  }
}
