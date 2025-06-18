import {
  AccessLevel,
  EggContextLifecycleProto,
  EggObjectLifecycleProto,
  EggPrototypeLifecycleProto,
  LoadUnitInstanceLifecycleProto,
  LoadUnitLifecycleProto
} from '../../..';

@LoadUnitLifecycleProto()
export class ControllerLoadUnitLifecycle {}

@LoadUnitInstanceLifecycleProto()
export class ControllerLoadUnitInstanceLifecycle {}

@EggObjectLifecycleProto()
export class ControllerObjectLifecycle {}

@EggPrototypeLifecycleProto()
export class ControllerPrototypeLifecycle {}

@EggContextLifecycleProto()
export class ControllerContextLifecycle {}

@LoadUnitLifecycleProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'customName',
})
export class ControllerOtherLifecycle {}
