import { StandaloneInnerObjectProto } from './StandaloneInnerObjectProto';
import { EggObject, EggObjectFactory, EggObjectLifeCycleContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil, EggObjectName } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg-metadata';

const OBJ = Symbol('EggCompatibleObject#obj');

export class StandaloneInnerObject implements EggObject {
  readonly isReady: boolean = true;
  private [OBJ]: object;
  readonly proto: StandaloneInnerObjectProto;
  readonly name: EggObjectName;
  readonly id: string;

  constructor(name: EggObjectName, proto: StandaloneInnerObjectProto) {
    this.proto = proto;
    this.name = name;
    this.id = IdenticalUtil.createObjectId(this.proto.id);
  }

  get obj() {
    if (!this[OBJ]) {
      this[OBJ] = this.proto.constructEggObject();
    }
    return this[OBJ];
  }

  injectProperty() {
    return;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype, _: EggObjectLifeCycleContext): Promise<StandaloneInnerObject> {
    return new StandaloneInnerObject(name, proto as StandaloneInnerObjectProto);
  }
}

EggObjectFactory.registerEggObjectCreateMethod(StandaloneInnerObjectProto, StandaloneInnerObject.createObject);
