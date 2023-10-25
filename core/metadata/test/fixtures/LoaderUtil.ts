import { EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import is from 'is-type-of';

export class LoaderUtil {
  static loadFile(filePath: string): EggProtoImplClass[] {
    let exports;
    try {
      exports = require(filePath);
    } catch (e) {
      e.message = '[tegg/loader] load ' + filePath + ' failed: ' + e.message;
      throw e;
    }
    const clazzList: EggProtoImplClass[] = [];
    const exportNames = Object.keys(exports);
    for (const exportName of exportNames) {
      const clazz = exports[exportName];
      const isEggProto = is.class(clazz) && (PrototypeUtil.isEggPrototype(clazz) || PrototypeUtil.isEggMultiInstancePrototype(clazz));
      if (!isEggProto) {
        continue;
      }
      PrototypeUtil.setFilePath(clazz, filePath);
      clazzList.push(clazz);
    }
    return clazzList;
  }
}
