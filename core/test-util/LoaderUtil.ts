import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';

export class LoaderUtil {
  static loadFile(filePath: string): EggProtoImplClass | null {
    let clazz;
    try {
      clazz = require(filePath);
    } catch (_) {
      return null;
    }
    clazz = clazz.__esModule && 'default' in clazz ? clazz.default : clazz;
    if (!PrototypeUtil.isEggPrototype(clazz)) {
      return null;
    }
    PrototypeUtil.setFilePath(clazz, filePath);
    return clazz;
  }
}
