import { EggPrototype, EggPrototypeFactory, LoadUnit } from '@eggjs/tegg-metadata';
import { EggPrototypeName, ObjectInitType, QualifierInfo } from '@eggjs/tegg';
import { MapUtil } from '@eggjs/tegg-common-util';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { StandaloneInnerObjectProto } from './StandaloneInnerObjectProto';

export const StandaloneLoadUnitType = 'StandaloneLoadUnitType';

export class StandaloneLoadUnit implements LoadUnit {
  readonly id: string = 'StandaloneLoadUnit';
  readonly name: string = 'StandaloneLoadUnit';
  readonly unitPath: string = 'MockStandaloneLoadUnitPath';
  readonly type = StandaloneLoadUnitType;

  private innerObject: Record<string, object>;
  private protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  constructor(innerObject: Record<string, object>) {
    this.innerObject = innerObject;
  }

  async init() {
    for (const [ name, obj ] of Object.entries(this.innerObject)) {
      const proto = new StandaloneInnerObjectProto(
        IdenticalUtil.createProtoId(this.id, name),
        name,
        (() => obj) as any,
        ObjectInitType.SINGLETON,
        this.id,
        [],
      );
      EggPrototypeFactory.instance.registerPrototype(proto, this);
    }
  }


  containPrototype(proto: EggPrototype): boolean {
    return !!(this.protoMap.get(proto.name)?.find(t => t === proto));
  }

  getEggPrototype(name: string, qualifiers: QualifierInfo[]): EggPrototype[] {
    const protos = this.protoMap.get(name);
    return protos?.filter(proto => proto.verifyQualifiers(qualifiers)) || [];
  }

  registerEggPrototype(proto: EggPrototype) {
    const protoList = MapUtil.getOrStore(this.protoMap, proto.name, []);
    protoList.push(proto);
  }

  deletePrototype(proto: EggPrototype) {
    const protos = this.protoMap.get(proto.name);
    if (protos) {
      const index = protos.indexOf(proto);
      if (index !== -1) {
        protos.splice(index, 1);
      }
    }
  }

  async destroy() {
    for (const namedProtoMap of this.protoMap.values()) {
      for (const proto of namedProtoMap.values()) {
        EggPrototypeFactory.instance.deletePrototype(proto, this);
      }
    }
    this.protoMap.clear();
  }

  iterateEggPrototype(): IterableIterator<EggPrototype> {
    const protos: EggPrototype[] = Array.from(this.protoMap.values())
      .reduce((p, c) => {
        p = p.concat(c);
        return p;
      }, []);
    return protos.values();
  }
}
