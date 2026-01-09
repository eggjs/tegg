import { EggPrototype, LoadUnit } from '@eggjs/tegg-metadata';
import {
  InjectObjectProto,
} from '@eggjs/tegg-types';
import {
  AccessLevel,
  EggPrototypeName,
  ObjectInitType,
  QualifierInfo,
  Id,
  IdenticalUtil,
  QualifierAttribute,
  QualifierValue,
} from '@eggjs/tegg';
import { GraphMetadata } from '@eggjs/tegg-langchain-decorator';

export class CompiledStateGraphProto implements EggPrototype {
  private readonly qualifiers: QualifierInfo[];
  readonly accessLevel = AccessLevel.PUBLIC;
  id: Id;
  readonly initType = ObjectInitType.SINGLETON;
  readonly injectObjects: InjectObjectProto[] = [];
  loadUnitId: string;
  readonly name: EggPrototypeName;
  readonly graphMetadata: GraphMetadata;
  readonly graphName: string;
  readonly unitPath: string;

  constructor(loadUnit: LoadUnit, protoName: string, graphName: string, graphMetadata: GraphMetadata) {
    this.loadUnitId = loadUnit.id;
    this.qualifiers = [];
    this.name = protoName;
    this.graphMetadata = graphMetadata;
    this.graphName = graphName;
    this.unitPath = loadUnit.unitPath;
    this.id = IdenticalUtil.createProtoId(loadUnit.id, protoName);
  }

  constructEggObject(): object {
    return {};
  }

  getMetaData<T>(): T | undefined {
    // TODO set default metadata
    return;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find(t => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  getQualifier(attribute: QualifierAttribute): QualifierValue | undefined {
    const qualifier = this.qualifiers.find(t => t.attribute === attribute);
    return qualifier?.value;
  }
}
