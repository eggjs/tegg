import Base from 'sdk-base';
import path from 'path';
import { Application } from 'egg';
import { EggLoadUnitType, LoadUnit } from '@eggjs/tegg-metadata';
import { LoadUnitInstance } from '@eggjs/tegg-runtime';
import { CONTROLLER_LOAD_UNIT } from './ControllerLoadUnit';

export class ControllerLoadUnitHandler extends Base {
  private readonly app: Application;
  controllerLoadUnit: LoadUnit;
  controllerLoadUnitInstance: LoadUnitInstance;

  constructor(app: Application) {
    super({ initMethod: '_init' });
    this.app = app;
  }

  async _init() {
    const controllerDir = path.join(this.app.config.baseDir, 'app/controller');
    const loader = this.app.loaderFactory.createLoader(controllerDir, CONTROLLER_LOAD_UNIT as EggLoadUnitType);
    this.controllerLoadUnit = await this.app.loadUnitFactory.createLoadUnit(controllerDir, CONTROLLER_LOAD_UNIT, loader);
    this.controllerLoadUnitInstance = await this.app.loadUnitInstanceFactory.createLoadUnitInstance(this.controllerLoadUnit);
  }

  async destroy() {
    if (this.controllerLoadUnit) {
      await this.app.loadUnitFactory.destroyLoadUnit(this.controllerLoadUnit);
    }
    if (this.controllerLoadUnitInstance) {
      await this.app.loadUnitInstanceFactory.destroyLoadUnitInstance(this.controllerLoadUnitInstance);
    }
  }
}
