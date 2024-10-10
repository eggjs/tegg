import { Application } from 'egg';
import { CrosscutAdviceFactory } from '@eggjs/tegg/aop';
import {
  crossCutGraphHook,
  EggObjectAopHook,
  EggPrototypeCrossCutHook,
  LoadUnitAopHook,
  pointCutGraphHook,
} from '@eggjs/tegg-aop-runtime';
import { AopContextHook } from './lib/AopContextHook';
import { GlobalGraph } from '@eggjs/tegg-metadata';

export default class AopAppHook {
  private readonly app: Application;

  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;
  private readonly loadUnitAopHook: LoadUnitAopHook;
  private readonly eggPrototypeCrossCutHook: EggPrototypeCrossCutHook;
  private readonly eggObjectAopHook: EggObjectAopHook;
  private aopContextHook: AopContextHook;

  constructor(app: Application) {
    this.app = app;
    this.crosscutAdviceFactory = new CrosscutAdviceFactory();
    this.loadUnitAopHook = new LoadUnitAopHook(this.crosscutAdviceFactory);
    this.eggPrototypeCrossCutHook = new EggPrototypeCrossCutHook(this.crosscutAdviceFactory);
    this.eggObjectAopHook = new EggObjectAopHook();
  }

  configDidLoad() {
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.eggPrototypeCrossCutHook);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.loadUnitAopHook);
    this.app.eggObjectLifecycleUtil.registerLifecycle(this.eggObjectAopHook);
    GlobalGraph.instance!.registerBuildHook(crossCutGraphHook);
    GlobalGraph.instance!.registerBuildHook(pointCutGraphHook);
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
    this.aopContextHook = new AopContextHook(this.app.moduleHandler);
    this.app.eggContextLifecycleUtil.registerLifecycle(this.aopContextHook);
  }

  beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.eggPrototypeCrossCutHook);
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitAopHook);
    this.app.eggObjectLifecycleUtil.deleteLifecycle(this.eggObjectAopHook);
    this.app.eggContextLifecycleUtil.deleteLifecycle(this.aopContextHook);
  }
}
