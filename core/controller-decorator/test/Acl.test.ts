import assert from 'assert';
import { AclController } from './fixtures/AclController';
import { ControllerMetaBuilderFactory } from '../src/builder/ControllerMetaBuilderFactory';
import { ControllerType, HTTPControllerMeta } from '../src/model';

describe('test/Context.test.ts', () => {
  it('should work', () => {
    const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(AclController, ControllerType.HTTP)!;
    const aclControllerMeta = builder.build()! as HTTPControllerMeta;
    const fooMethod = aclControllerMeta.methods.find(t => t.name === 'foo')!;
    const barMethod = aclControllerMeta.methods.find(t => t.name === 'bar')!;
    const fooAcl = aclControllerMeta.getMethodAcl(fooMethod);
    const barAcl = aclControllerMeta.getMethodAcl(barMethod);
    assert(fooAcl === 'mock2');
    assert(barAcl === 'mock1');
  });
});
