import assert from 'assert';
import { HostController } from '../fixtures/HostController';
import ControllerInfoUtil from '../../src/util/ControllerInfoUtil';
import MethodInfoUtil from '../../src/util/MethodInfoUtil';

describe('test/Host.test.ts', () => {
  it('controller Host work', () => {
    const controllerHost = ControllerInfoUtil.getControllerHost(HostController);
    assert(controllerHost === 'foo.eggjs.com');
  });

  it('method Host work', () => {
    const methodHost = MethodInfoUtil.getMethodHost(HostController, 'bar');
    assert(methodHost === 'bar.eggjs.com');
  });
});
