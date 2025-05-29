import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { MetadataUtil } from '@eggjs/core-decorator';

export interface EggModulePlugin {}

export class EggModulePluginUtil {
  static #plugins: Set<EggModulePlugin> = new Set();

  static addPlugin(plugin: EggModulePlugin) {
    EggModulePluginUtil.#plugins.add(plugin);
  }

  static removePlugin(plugin: EggModulePlugin) {
    EggModulePluginUtil.#plugins.delete(plugin);
  }

  static async triggerPluginHook(hookName: string, ...args: any[]) {
    const PLUGIN_HOOK = Symbol.for(`EggPrototype#ModulePlugin.${hookName}`);
    for (const plugin of EggModulePluginUtil.#plugins) {
      const method = MetadataUtil.getMetaData<string>(PLUGIN_HOOK, plugin.constructor as EggProtoImplClass);
      if (method) {
        await plugin[method](...args);
      }
    }
  }

  static setPluginHook(method: string, hookName: string, clazz: EggProtoImplClass) {
    const PLUGIN_HOOK = Symbol.for(`EggPrototype#ModulePlugin.${hookName}`);
    MetadataUtil.defineMetaData(PLUGIN_HOOK, method, clazz);
  }
}
