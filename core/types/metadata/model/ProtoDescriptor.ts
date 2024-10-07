import { AccessLevel, EggPrototypeInfo, ObjectInitTypeLike, QualifierInfo } from '../../core-decorator';
import { ProtoDescriptorType } from '../enum/ProtoDescriptorType';

export type ProtoDescriptorTypeLike = ProtoDescriptorType | string;

export interface InjectObjectDescriptor {
  refName: PropertyKey;
  objName: PropertyKey;
  qualifiers: QualifierInfo[];
}

export interface ProtoDescriptor extends EggPrototypeInfo {
  // base properties
  name: PropertyKey;
  accessLevel: AccessLevel;
  initType: ObjectInitTypeLike;
  qualifiers: QualifierInfo[];
  injectObjects: InjectObjectDescriptor[];
  protoImplType: string;
  properQualifiers: Record<PropertyKey, QualifierInfo[]>;

  // module info
  defineModuleName: string;
  defineUnitPath: string;
  // multi instance proto may be used in other module
  instanceModuleName: string;
  instanceDefineUnitPath: string;

  // test is the same proto
  equal(protoDescriptor: ProtoDescriptor): boolean;
}
