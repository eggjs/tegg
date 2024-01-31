import {
  EggLoadUnitType,
  EggLoadUnitTypeLike,
  EggPrototype,
  EggPrototypeFactory,
  Loader,
  LoadUnit,
  LoadUnitFactory,
  LoadUnitLifecycleContext,
  EggPrototypeCreatorFactory,
} from '@eggjs/tegg-metadata';
import {
  Id,
  IdenticalUtil,
  EggPrototypeName,
  QualifierInfo,
  PrototypeUtil,
  InitTypeQualifierAttribute, LoadUnitNameQualifierAttribute, QualifierUtil,
} from '@eggjs/tegg';
import { MapUtil } from '@eggjs/tegg-common-util';

export class AppLoadUnit implements LoadUnit {
  private readonly loader: Loader;
  id: Id;
  readonly name: string;
  readonly type: EggLoadUnitTypeLike = EggLoadUnitType.APP;
  readonly unitPath: string;
  private protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  constructor(name: string, unitPath: string, loader: Loader) {
    this.id = IdenticalUtil.createLoadUnitId(name);
    this.name = name;
    this.unitPath = unitPath;
    this.loader = loader;
  }

  async init() {
    const clazzList = this.loader.load();
    for (const clazz of clazzList) {
      // TODO duplicate code, same in ModuleLoadUnit
      const defaultQualifier = [{
        attribute: InitTypeQualifierAttribute,
        value: PrototypeUtil.getInitType(clazz, {
          unitPath: this.unitPath,
        })!,
      }, {
        attribute: LoadUnitNameQualifierAttribute,
        value: this.name,
      }];
      defaultQualifier.forEach(qualifier => {
        QualifierUtil.addProtoQualifier(clazz, qualifier.attribute, qualifier.value);
      });
      const protos = await EggPrototypeCreatorFactory.createProto(clazz, this);
      for (const proto of protos) {
        EggPrototypeFactory.instance.registerPrototype(proto, this);
      }
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
    for (const namedProtos of this.protoMap.values()) {
      // Delete prototype will delete item
      // array iterator is not safe
      const protos = namedProtos.slice();
      for (const proto of protos) {
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

  static createModule(ctx: LoadUnitLifecycleContext): AppLoadUnit {
    return new AppLoadUnit('tegg-app', ctx.unitPath, ctx.loader);
  }
}

LoadUnitFactory.registerLoadUnitCreator(EggLoadUnitType.APP, AppLoadUnit.createModule);
