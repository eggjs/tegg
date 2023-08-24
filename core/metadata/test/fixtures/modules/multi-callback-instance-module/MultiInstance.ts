import {
  AccessLevel,
  ObjectInitType,
  MultiInstanceProto,
  MultiInstancePrototypeGetObjectsContext,
} from '@eggjs/core-decorator';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

export const FOO_ATTRIBUTE = Symbol.for('FOO_ATTRIBUTE');

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath);
    return (config as any).features.logger.map(name => {
      return {
        name: 'foo',
        qualifiers: [{
          attribute: FOO_ATTRIBUTE,
          value: name,
        }],
      }
    });
  },
})
export class FooDynamicLogger {

}
