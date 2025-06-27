import {
  ClassProtoDescriptor,
  EggPrototype,
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  LoadUnit,
  ProtoDescriptor,
} from '@eggjs/tegg-metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggPrototypeName, ObjectInitType, QualifierInfo } from '@eggjs/tegg-types';
import { StandaloneInnerObjectProto } from '../StandaloneInnerObjectProto';
import { InnerObject } from '../common/types';
import {
  StandaloneLoadUnitId,
  StandaloneLoadUnitName,
  StandaloneLoadUnitPath,
  StandaloneLoadUnitType,
} from '../common/constant';

export class StandaloneLoadUnit implements LoadUnit {
  readonly id: string = StandaloneLoadUnitId;
  readonly name: string = StandaloneLoadUnitName;
  readonly unitPath: string = StandaloneLoadUnitPath;
  readonly type = StandaloneLoadUnitType;

  #innerObject: Record<string, InnerObject[]>;
  #protos: ProtoDescriptor[];
  #protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  constructor(innerObject: Record<string, InnerObject[]>, protos?: ProtoDescriptor[]) {
    this.#innerObject = innerObject;
    this.#protos = protos || [];
  }

  async init() {
    for (const [ name, objs ] of Object.entries(this.#innerObject)) {
      for (const { obj, qualifiers } of objs) {
        const proto = new StandaloneInnerObjectProto(
          IdenticalUtil.createProtoId(this.id, name),
          name,
          (() => obj) as any,
          ObjectInitType.SINGLETON,
          this.id,
          qualifiers || [],
        );
        EggPrototypeFactory.instance.registerPrototype(proto, this);
      }
    }

    const protos = this.#protos.filter(t => ClassProtoDescriptor.isClassProtoDescriptor(t));
    for (const protoDescriptor of protos) {
      const proto = await EggPrototypeCreatorFactory.createProtoByDescriptor(protoDescriptor, this);
      EggPrototypeFactory.instance.registerPrototype(proto, this);
    }
  }

  containPrototype(proto: EggPrototype): boolean {
    return !!(this.#protoMap.get(proto.name)?.find(t => t === proto));
  }

  getEggPrototype(name: string, qualifiers: QualifierInfo[]): EggPrototype[] {
    const protos = this.#protoMap.get(name);
    return protos?.filter(proto => proto.verifyQualifiers(qualifiers)) || [];
  }

  registerEggPrototype(proto: EggPrototype) {
    const protoList = MapUtil.getOrStore(this.#protoMap, proto.name, []);
    protoList.push(proto);
  }

  deletePrototype(proto: EggPrototype) {
    const protos = this.#protoMap.get(proto.name);
    if (protos) {
      const index = protos.indexOf(proto);
      if (index !== -1) {
        protos.splice(index, 1);
      }
    }
  }

  async destroy() {
    for (const namedProtoMap of this.#protoMap.values()) {
      for (const proto of Array.from(namedProtoMap)) {
        EggPrototypeFactory.instance.deletePrototype(proto, this);
      }
    }
    this.#protoMap.clear();
  }

  iterateEggPrototype(): IterableIterator<EggPrototype> {
    const protos: EggPrototype[] = Array.from(this.#protoMap.values())
      .reduce((p, c) => {
        p = p.concat(c);
        return p;
      }, []);
    return protos.values();
  }
}
