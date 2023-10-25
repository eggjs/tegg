import { MultiInstanceProto } from '../../../src/decorator/MultiInstanceProto';
import { AccessLevel } from '../../../src/enum/AccessLevel';
import { ObjectInitType } from '../../../src/enum/ObjectInitType';

export const FOO_ATTRIBUTE = Symbol.for('FOO_ATTRIBUTE');

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  protoImplType: 'foo',
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

}
