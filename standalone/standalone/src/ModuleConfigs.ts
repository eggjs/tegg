import { ModuleConfig } from 'egg';
import { ModuleReference } from '@eggjs/tegg-common-util';

export interface ModuleConfigHolder {
  name: string;
  config: ModuleConfig;
  reference: ModuleReference;
}

export class ModuleConfigs {
  constructor(readonly inner: Record<string, ModuleConfigHolder>) {
  }

  get(moduleName: string): ModuleConfig | undefined {
    return this.inner[moduleName]?.config;
  }
}
