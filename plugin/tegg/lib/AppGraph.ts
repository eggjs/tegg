import assert from 'assert';
import path from 'path';
import { Graph, GraphNode, GraphNodeObj } from '@eggjs/tegg-common-util';
import {
  EggProtoImplClass,
  EggPrototypeName,
  INIT_TYPE_TRY_ORDER,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  PrototypeUtil,
  QualifierInfo,
  QualifierUtil,
} from '@eggjs/tegg';

export interface ModuleConfig {
  path: string;
}

export class ModuleNode implements GraphNodeObj {
  readonly id: string;
  readonly name: string;
  readonly moduleConfig: ModuleConfig;
  private clazzList: EggProtoImplClass[];

  // TODO refactor to ModuleUtil
  static readModuleName(modulePath: string): string {
    const pkgPath = path.join(modulePath, 'package.json');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(pkgPath);
    assert(pkg.eggModule, `module config not found in package ${pkgPath}`);
    const { name } = pkg.eggModule;
    return name;
  }

  constructor(moduleConfig: ModuleConfig) {
    this.moduleConfig = moduleConfig;
    this.id = moduleConfig.path;
    this.name = ModuleNode.readModuleName(moduleConfig.path);
    this.clazzList = [];
  }

  addClazz(clazz: EggProtoImplClass) {
    this.clazzList.push(clazz);
  }

  getClazzList(): readonly EggProtoImplClass[] {
    return this.clazzList;
  }

  toString() {
    return `${this.name}@${this.moduleConfig.path}`;
  }

  verifyQualifiers(clazz: EggProtoImplClass, qualifiers: QualifierInfo[]): boolean {
    const clazzQualifiers = QualifierUtil.getProtoQualifiers(clazz);
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(clazzQualifiers, qualifier)) {
        return false;
      }
    }
    return true;
  }

  verifyQualifier(clazzQualifiers: QualifierInfo[], qualifier: QualifierInfo) {
    const selfQualifiers = clazzQualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  findImplementClazzList(objName: EggPrototypeName, qualifiers: QualifierInfo[]): EggProtoImplClass[] {
    const moduleQualifier = qualifiers.find(t => t.attribute === LoadUnitNameQualifierAttribute);
    if (moduleQualifier && moduleQualifier.value !== this.name) {
      return [];
    }
    const implList = this.clazzList
      .filter(clazz => PrototypeUtil.getProperty(clazz)?.name === objName)
      .filter(clazz => this.verifyQualifiers(clazz, qualifiers));
    if (implList.length === 1) {
      return implList;
    }
    const initTypeQualifiers = INIT_TYPE_TRY_ORDER.map(type => ({
      attribute: InitTypeQualifierAttribute,
      value: type,
    }));
    for (const initTypeQualifier of initTypeQualifiers) {
      const initTypeList = implList.filter(clazz => this.verifyQualifiers(clazz, [ initTypeQualifier ]));
      if (initTypeList.length === 1) {
        return initTypeList;
      }
    }
    return implList;
  }
}

export class AppGraph {
  private graph: Graph<ModuleNode>;
  moduleConfigList: Array<ModuleConfig>;

  constructor() {
    this.graph = new Graph<ModuleNode>();
  }

  addNode(moduleNode: ModuleNode) {
    if (!this.graph.addVertex(new GraphNode(moduleNode))) {
      throw new Error(`duplicate module: ${moduleNode}`);
    }
  }

  private findDependencyModule(objName: EggPrototypeName, qualifiers: QualifierInfo[]): Array<GraphNode<ModuleNode>> {
    const nodes: Array<GraphNode<ModuleNode>> = Array.from(this.graph.nodes.values());
    return nodes.filter(node => {
      const clazzList = node.val.findImplementClazzList(objName, qualifiers);
      return clazzList.length;
    });
  }

  build() {
    for (const node of this.graph.nodes.values()) {
      for (const clazz of node.val.getClazzList()) {
        const injectObjects = PrototypeUtil.getInjectObjects(clazz);
        for (const injectObject of injectObjects) {
          const qualifiers = QualifierUtil.getProperQualifiers(clazz, injectObject.refName);
          const dependencyModules = this.findDependencyModule(injectObject.objName, qualifiers);
          for (const moduleNode of dependencyModules) {
            if (node !== moduleNode) {
              this.graph.addEdge(node, moduleNode);
            }
          }
        }
      }
    }
  }

  sort() {
    const loopPath = this.graph.loopPath();
    if (loopPath) {
      throw new Error('module has recursive deps: ' + loopPath);
    }
    this.moduleConfigList = this.graph.sort().map(t => t.val.moduleConfig);
  }
}
