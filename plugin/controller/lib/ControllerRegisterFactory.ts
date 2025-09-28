import type { Application } from 'egg';
import { ControllerMetadata, ControllerTypeLike } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';

import { ControllerRegister } from './ControllerRegister.js';

export type RegisterCreator = (proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application) => ControllerRegister;

export class ControllerRegisterFactory {
  private readonly app: Application;
  private registerCreatorMap: Map<ControllerTypeLike, RegisterCreator>;

  constructor(app: Application) {
    this.app = app;
    this.registerCreatorMap = new Map();
  }

  registerControllerRegister(type: ControllerTypeLike, creator: RegisterCreator) {
    this.registerCreatorMap.set(type, creator);
  }

  getControllerRegister(proto: EggPrototype, metadata: ControllerMetadata): ControllerRegister | undefined {
    const creator = this.registerCreatorMap.get(metadata.type);
    if (!creator) {
      return;
    }
    return creator(proto, metadata, this.app);
  }
}
