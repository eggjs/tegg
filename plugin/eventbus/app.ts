import { Application } from 'egg';
import { EventHandlerProtoManager } from './lib/EventHandlerProtoManager';
import { EventbusLoadUnitHook } from './lib/EventbusLoadUnitHook';
import { EventbusProtoHook } from './lib/EventbusProtoHook';

export default class EventbusAppHook {
  private readonly app: Application;
  private readonly eventHandlerProtoManager: EventHandlerProtoManager;
  private readonly eventbusLoadUnitHook: EventbusLoadUnitHook;
  private readonly eventbusProtoHook: EventbusProtoHook;

  constructor(app) {
    this.app = app;
    this.eventHandlerProtoManager = new EventHandlerProtoManager(app);
    this.eventbusLoadUnitHook = new EventbusLoadUnitHook();
    this.eventbusProtoHook = new EventbusProtoHook(this.eventHandlerProtoManager);
  }

  configDidLoad() {
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.eventbusProtoHook);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.eventbusLoadUnitHook);
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
    await this.eventHandlerProtoManager.register();
  }

  beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.eventbusProtoHook);
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.eventbusLoadUnitHook);
  }
}
