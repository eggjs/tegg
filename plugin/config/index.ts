import { ModuleReference as ModuleReferenceAlias } from '@eggjs/tegg-common-util';

declare module '@eggjs/core' {
  export type ModuleReference = ModuleReferenceAlias;

  export interface ModuleConfig {
  }

  export interface ModuleConfigHolder {
    name: string;
    config: ModuleConfig;
    reference: ModuleReference;
  }

  export interface ModuleConfigApplication {
    moduleReferences: readonly ModuleReference[];
    moduleConfigs: Record<string, ModuleConfigHolder>;
  }

  export interface EggCore extends ModuleConfigApplication {

  }
}
