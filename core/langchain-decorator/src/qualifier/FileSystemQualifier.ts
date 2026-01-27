import { QualifierUtil } from '@eggjs/tegg';

export const FileSystemQualifierAttribute = Symbol.for('Qualifier.FileSystem');
export const FileSystemInjectName = 'teggFilesystem';

export function FileSystemQualifier(fsMiddlewareName: string) {
  return function(target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(target, propertyKey, parameterIndex, FileSystemQualifierAttribute, fsMiddlewareName);
  };
}
