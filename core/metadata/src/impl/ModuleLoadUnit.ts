import assert from 'assert';
import path from 'path';

import { Graph, GraphNode, GraphNodeObj, MapUtil } from '@eggjs/tegg-common-util';
import {
  EggProtoImplClass,
  EggPrototypeName,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  ObjectInitTypeLike,
  PrototypeUtil,
  QualifierInfo,
  QualifierUtil,
} from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';

import { LoadUnit, LoadUnitLifecycleContext } from '../model/LoadUnit';
import { Loader } from '../model/Loader';
import { EggPrototype } from '../model/EggPrototype';
import { EggLoadUnitType } from '../enum/EggLoadUnitType';
import { EggPrototypeFactory } from '../factory/EggPrototypeFactory';
import { LoadUnitFactory } from '../factory/LoadUnitFactory';
import { EggPrototypeCreatorFactory } from '../factory/EggPrototypeCreatorFactory';

let id = 0;

class ProtoNode implements GraphNodeObj {
  readonly clazz: EggProtoImplClass;
  readonly name: EggPrototypeName;
  readonly id: string;
  readonly qualifiers: QualifierInfo[];
  readonly initType: ObjectInitTypeLike;

  constructor(clazz: EggProtoImplClass) {
    const property = PrototypeUtil.getProperty(clazz)!;
    this.name = property.name;
    this.id = '' + (id++);
    this.clazz = clazz;
    this.qualifiers = QualifierUtil.getProtoQualifiers(clazz);
    this.initType = property.initType;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  toString(): string {
    return `${this.clazz.name}@${PrototypeUtil.getFilePath(this.clazz)}`;
  }
}

export class ModuleGraph {
  private graph: Graph<ProtoNode>;
  clazzList: EggProtoImplClass[];

  constructor(clazzList: EggProtoImplClass[]) {
    this.clazzList = clazzList;
    this.graph = new Graph<ProtoNode>();
    this.build();
  }

  private findInjectNode(objName: EggPrototypeName, qualifiers: QualifierInfo[], parentInitTye: ObjectInitTypeLike): GraphNode<ProtoNode> | undefined {
    let nodes = Array.from(this.graph.nodes.values())
      .filter(t => t.val.name === objName)
      .filter(t => t.val.verifyQualifiers(qualifiers));
    if (nodes.length === 0) {
      return undefined;
    }
    if (nodes.length === 1) {
      return nodes[0];
    }

    const initTypeQualifier = {
      attribute: InitTypeQualifierAttribute,
      value: parentInitTye,
    };

    nodes = nodes.filter(t => t.val.verifyQualifier(initTypeQualifier));
    if (nodes.length === 1) {
      return nodes[0];
    }

    const result = nodes.map(node => node.val.toString());
    throw new Error(`multi proto find for name ${String(objName)} and qualifiers ${JSON.stringify(qualifiers)}, result is ${JSON.stringify(result)}`);
  }

  private build() {
    const protoGraphNodes = this.clazzList.map(t => new GraphNode(new ProtoNode(t)));
    for (const node of protoGraphNodes) {
      if (!this.graph.addVertex(node)) {
        throw new Error(`duplicate proto: ${node.val.id}`);
      }
    }
    for (const node of protoGraphNodes) {
      const injectObjects = PrototypeUtil.getInjectObjects(node.val.clazz);
      for (const injectObject of injectObjects) {
        const qualifiers = QualifierUtil.getProperQualifiers(node.val.clazz, injectObject.refName);
        const injectNode = this.findInjectNode(injectObject.objName, qualifiers, node.val.initType);
        // If not found maybe in other module
        if (injectNode) {
          this.graph.addEdge(node, injectNode);
        }
      }
    }
  }

  sort() {
    const loopPath = this.graph.loopPath();
    if (loopPath) {
      throw new Error('proto has recursive deps: ' + loopPath);
    }
    this.clazzList = this.graph.sort().map(t => t.val.clazz);
  }
}

export class ModuleLoadUnit implements LoadUnit {
  private loader: Loader;
  private protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();
  private clazzList: EggProtoImplClass[];

  readonly id: string;
  readonly name: string;
  readonly unitPath: string;
  readonly type = EggLoadUnitType.MODULE;

  constructor(name: string, unitPath: string, loader: Loader) {
    this.id = IdenticalUtil.createLoadUnitId(name);
    this.name = name;
    this.unitPath = unitPath;
    this.loader = loader;
  }

  private loadClazz(): EggProtoImplClass[] {
    const clazzList = this.loader.load();
    for (const clazz of clazzList) {
      const property = PrototypeUtil.getProperty(clazz)!;
      const defaultQualifier = [{
        attribute: InitTypeQualifierAttribute,
        value: property.initType,
      }, {
        attribute: LoadUnitNameQualifierAttribute,
        value: this.name,
      }];
      defaultQualifier.forEach(qualifier => {
        QualifierUtil.addProtoQualifier(clazz, qualifier.attribute, qualifier.value);
      });
    }
    return clazzList;
  }

  async init() {
    const clazzList = this.loadClazz();
    const protoGraph = new ModuleGraph(clazzList);
    protoGraph.sort();
    this.clazzList = protoGraph.clazzList;
    for (const clazz of this.clazzList) {
      const proto = await EggPrototypeCreatorFactory.createProto(clazz, this);
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

  static createModule(ctx: LoadUnitLifecycleContext): ModuleLoadUnit {
    const pkgPath = path.join(ctx.unitPath, 'package.json');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(pkgPath);
    assert(pkg.eggModule, `module config not found in package ${pkgPath}`);
    const { name } = pkg.eggModule;
    return new ModuleLoadUnit(name, ctx.unitPath, ctx.loader);
  }
}

LoadUnitFactory.registerLoadUnitCreator(EggLoadUnitType.MODULE, ModuleLoadUnit.createModule);
