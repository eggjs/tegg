import path from 'path';
import { EggLoadUnitType, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { LoadUnitInstance, LoadUnitInstanceFactory } from '..';
import { LoaderFactory } from '@eggjs/tegg-loader';

export default class TestUtil {
  static async createLoadUnitInstance(modulePath: string) {
    const absolutePath = path.join(__dirname, 'fixtures/modules', modulePath);
    const loader = LoaderFactory.createLoader(absolutePath, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(absolutePath, EggLoadUnitType.MODULE, loader);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }

  static async destroyLoadUnitInstance(loadUnitInstance: LoadUnitInstance) {
    await LoadUnitInstanceFactory.destroyLoadUnitInstance(loadUnitInstance);
    await LoadUnitFactory.destroyLoadUnit(loadUnitInstance.loadUnit);
  }
}
