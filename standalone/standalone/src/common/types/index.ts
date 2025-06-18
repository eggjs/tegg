import { QualifierInfo, ReadModuleReferenceOptions } from '@eggjs/tegg-types';

export interface InnerObject {
  obj: object,
  qualifiers?: QualifierInfo[],
}

export interface ModuleDependency extends ReadModuleReferenceOptions {
  baseDir: string;
}
