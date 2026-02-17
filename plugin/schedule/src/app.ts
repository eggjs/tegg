import type { Application, ILifecycleBoot } from 'egg';

import { ScheduleManager } from './lib/ScheduleManager.ts';
import { ScheduleWorkerRegister } from './lib/ScheduleWorkerRegister.ts';
import { ScheduleWorkerLoadUnitHook } from './lib/ScheduleWorkerLoadUnitHook.ts';
import { SchedulePrototypeHook } from './lib/SchedulePrototypeHook.ts';

export default class ScheduleAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private readonly scheduleManager: ScheduleManager;
  private readonly scheduleWorkerRegister: ScheduleWorkerRegister;
  private readonly scheduleWorkerLoadUnitHook: ScheduleWorkerLoadUnitHook;
  private readonly schedulePrototypeHook: SchedulePrototypeHook;

  constructor(app: Application) {
    this.app = app;
    this.scheduleManager = new ScheduleManager(this.app);
    this.scheduleWorkerRegister = new ScheduleWorkerRegister(this.scheduleManager);
    this.scheduleWorkerLoadUnitHook = new ScheduleWorkerLoadUnitHook(this.scheduleWorkerRegister);
    this.schedulePrototypeHook = new SchedulePrototypeHook();
  }

  configWillLoad() {
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.scheduleWorkerLoadUnitHook);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.schedulePrototypeHook);
  }

  async beforeClose() {
    // Unregister all schedules before deleting lifecycle hooks
    this.scheduleManager.unregisterAll();

    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.scheduleWorkerLoadUnitHook);
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.schedulePrototypeHook);
  }
}
