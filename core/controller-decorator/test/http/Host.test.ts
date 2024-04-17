import assert from 'node:assert';
import { HostController } from '../fixtures/HostController';
import ControllerInfoUtil from '../../src/util/ControllerInfoUtil';
import MethodInfoUtil from '../../src/util/MethodInfoUtil';

describe('test/Host.test.ts', () => {
  it('controller Host work', () => {
    const controllerHost = ControllerInfoUtil.getControllerHosts(HostController);
    assert(controllerHost![0] === 'foo.eggjs.com');
  });

  it('method Host work', () => {
    const methodHost = MethodInfoUtil.getMethodHosts(HostController, 'bar');
    assert(methodHost![0] === 'bar.eggjs.com');
  });
});
