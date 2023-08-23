import is from 'is-type-of';
export type EnvType = 'local' | 'unittest' | 'prod' | string;

export interface RuntimeConfig {
  /**
   * Application name
   */
  name: string;

  /**
   * Application environment
   */
  env: EnvType;

  /**
   * Application directory
   */
  baseDir: string;
}

export class RuntimeConfigUtil {
  static #config: Map<keyof RuntimeConfig, string>;

  static setRuntimeConfig(config: Partial<RuntimeConfig>) {
    for (const key of Object.keys(config) as Array<keyof RuntimeConfig>) {
      const val = config[key];
      if (is.nullable(val)) continue;
      if (!is.string(val)) throw new Error(`The value of ${key} must be a string`);
      this.#config.set(key, val);
    }
  }

  static getRuntimeConfig(): RuntimeConfig {
    return {
      name: this.#config.get('name')!,
      env: this.#config.get('env') as EnvType,
      baseDir: this.#config.get('baseDir')!,
    };
  }

}
