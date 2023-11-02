import { ModuleConfig, ModuleReference } from './ModuleConfig';

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
