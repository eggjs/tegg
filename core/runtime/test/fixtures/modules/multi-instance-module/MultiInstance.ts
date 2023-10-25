import { AccessLevel, ObjectInitType, MultiInstanceProto, QualifierValue } from '@eggjs/core-decorator';
import { LifecycleInit } from '@eggjs/tegg-lifecycle';
import { EggObject, EggObjectLifeCycleContext } from '../../../../src/model/EggObject';


export const FOO_ATTRIBUTE = Symbol.for('FOO_ATTRIBUTE');

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  objects: [{
    name: 'foo',
    qualifiers: [{
      attribute: FOO_ATTRIBUTE,
      value: 'foo1',
    }],
  }, {
    name: 'foo',
    qualifiers: [{
      attribute: FOO_ATTRIBUTE,
      value: 'foo2',
    }],
  }],
})
export class FooLogger {
  loadUnitPath: string;
  foo: QualifierValue | undefined;

  @LifecycleInit()
  async init(ctx: EggObjectLifeCycleContext, obj: EggObject) {
    this.loadUnitPath = ctx.loadUnit.unitPath;
    this.foo = obj.proto.getQualifier(FOO_ATTRIBUTE);
  }
}
