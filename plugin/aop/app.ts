import { Application } from 'egg';
import { CrosscutAdviceFactory } from '@eggjs/tegg/aop';
import { EggObjectAopHook, EggPrototypeCrossCutHook, LoadUnitAopHook } from '@eggjs/tegg-aop-runtime';

export default class AopAppHook {
  private readonly app: Application;

  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;
  private readonly loadUnitAopHook: LoadUnitAopHook;
  private readonly eggPrototypeCrossCutHook: EggPrototypeCrossCutHook;
  private readonly eggObjectAopHook: EggObjectAopHook;

  constructor(app) {
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
  }

  beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.eggPrototypeCrossCutHook);
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitAopHook);
    this.app.eggObjectLifecycleUtil.deleteLifecycle(this.eggObjectAopHook);
  }
}
