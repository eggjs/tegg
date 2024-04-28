import { EggLoadUnitType } from '@eggjs/tegg-types';
import { DaoInfoUtil } from '@eggjs/tegg/dal';
import { BaseDaoType } from '@eggjs/tegg-types/dal';
import { LoaderFactory } from '@eggjs/tegg/helper';

export class DaoLoader {
  static loadDaos(moduleDir: string): Array<BaseDaoType> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const clazzList = loader.load();
    return clazzList.filter((t): t is BaseDaoType => {
      return DaoInfoUtil.getIsDao(t);
    });
  }
}
