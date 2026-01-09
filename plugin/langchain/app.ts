import type { Application, IBoot } from 'egg';
import { GlobalGraph } from '@eggjs/tegg-metadata';
import { GraphObjectHook } from './lib/graph/GraphObjectHook';
import { GraphLoadUnitHook } from './lib/graph/GraphLoadUnitHook';
import { CompiledStateGraphProto } from './lib/graph/CompiledStateGraphProto';
import { CompiledStateGraphObject } from './lib/graph/CompiledStateGraphObject';
import { BoundModelObjectHook } from './lib/boundModel/BoundModelObjectHook';
import { GraphPrototypeHook } from './lib/graph/GraphPrototypeHook';
import { GraphBuildHook } from './lib/graph/GraphBuildHook';
import { AgentHttpLoadUnitLifecycleHook } from './lib/agent/AgentHttpLoadUnitLifecycleHook';

export default class ModuleLangChainHook implements IBoot {
  readonly #app: Application;
  readonly #graphObjectHook: GraphObjectHook;
  readonly #graphLoadUnitHook: GraphLoadUnitHook;
  readonly #boundModelObjectHook: BoundModelObjectHook;
  readonly #graphPrototypeHook: GraphPrototypeHook;
  #agentHttpLoadUnitHook: AgentHttpLoadUnitLifecycleHook;

  constructor(app: Application) {
    this.#app = app;
    this.#graphObjectHook = new GraphObjectHook();
    this.#graphLoadUnitHook = new GraphLoadUnitHook(this.#app.eggPrototypeFactory);
    this.#boundModelObjectHook = new BoundModelObjectHook();
    this.#graphPrototypeHook = new GraphPrototypeHook();
    this.#app.loadUnitLifecycleUtil.registerLifecycle(this.#graphLoadUnitHook);
  }

  configWillLoad() {
    this.#agentHttpLoadUnitHook = new AgentHttpLoadUnitLifecycleHook(this.#app.moduleConfigs);
    this.#app.loadUnitLifecycleUtil.registerLifecycle(this.#agentHttpLoadUnitHook);
    this.#app.eggObjectLifecycleUtil.registerLifecycle(this.#graphObjectHook);
    this.#app.eggObjectLifecycleUtil.registerLifecycle(this.#boundModelObjectHook);
    this.#app.eggObjectFactory.registerEggObjectCreateMethod(CompiledStateGraphProto, CompiledStateGraphObject.createObject(this.#app));
    this.#app.eggPrototypeLifecycleUtil.registerLifecycle(this.#graphPrototypeHook);
  }

  configDidLoad() {
    GlobalGraph.instance!.registerBuildHook(GraphBuildHook);
  }

  async beforeClose() {
    if (this.#agentHttpLoadUnitHook) {
      this.#app.loadUnitLifecycleUtil.deleteLifecycle(this.#agentHttpLoadUnitHook);
    }
    this.#app.eggObjectLifecycleUtil.deleteLifecycle(this.#graphObjectHook);
    this.#app.eggObjectLifecycleUtil.deleteLifecycle(this.#boundModelObjectHook);
    this.#app.loadUnitLifecycleUtil.deleteLifecycle(this.#graphLoadUnitHook);
    this.#app.eggPrototypeLifecycleUtil.deleteLifecycle(this.#graphPrototypeHook);
  }
}
