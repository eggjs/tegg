import type { Application, IBoot } from 'egg';
import { GlobalGraph } from '@eggjs/tegg-metadata';
import { GraphObjectHook } from './lib/graph/GraphObjectHook.ts';
import { GraphLoadUnitHook } from './lib/graph/GraphLoadUnitHook.ts';
import { CompiledStateGraphProto } from './lib/graph/CompiledStateGraphProto.ts';
import { CompiledStateGraphObject } from './lib/graph/CompiledStateGraphObject.ts';
import { BoundModelObjectHook } from './lib/boundModel/BoundModelObjectHook.ts';
import { GraphPrototypeHook } from './lib/graph/GraphPrototypeHook.ts';
import { GraphBuildHook } from './lib/graph/GraphBuildHook.ts';

export default class ModuleLangChainHook implements IBoot {
  readonly #app: Application;
  readonly #graphObjectHook: GraphObjectHook;
  readonly #graphLoadUnitHook: GraphLoadUnitHook;
  readonly #boundModelObjectHook: BoundModelObjectHook;
  readonly #graphPrototypeHook: GraphPrototypeHook;

  constructor(app: Application) {
    this.#app = app;
    this.#graphObjectHook = new GraphObjectHook();
    this.#graphLoadUnitHook = new GraphLoadUnitHook(this.#app.eggPrototypeFactory as any);
    this.#boundModelObjectHook = new BoundModelObjectHook();
    this.#graphPrototypeHook = new GraphPrototypeHook();
    this.#app.loadUnitLifecycleUtil.registerLifecycle(this.#graphLoadUnitHook);
  }

  configWillLoad() {
    this.#app.eggObjectLifecycleUtil.registerLifecycle(this.#graphObjectHook);
    this.#app.eggObjectLifecycleUtil.registerLifecycle(this.#boundModelObjectHook);
    this.#app.eggObjectFactory.registerEggObjectCreateMethod(CompiledStateGraphProto as any, CompiledStateGraphObject.createObject);
    this.#app.eggPrototypeLifecycleUtil.registerLifecycle(this.#graphPrototypeHook);
  }

  configDidLoad() {
    GlobalGraph.instance!.registerBuildHook(GraphBuildHook);
  }

  async beforeClose() {
    this.#app.eggObjectLifecycleUtil.deleteLifecycle(this.#graphObjectHook);
    this.#app.eggObjectLifecycleUtil.deleteLifecycle(this.#boundModelObjectHook);
    this.#app.loadUnitLifecycleUtil.deleteLifecycle(this.#graphLoadUnitHook);
    this.#app.eggPrototypeLifecycleUtil.deleteLifecycle(this.#graphPrototypeHook);
  }
}
