import { Prototype } from './Prototype';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
import type { ContextProtoParams } from '@eggjs/tegg-types';

export function ContextProto(params?: ContextProtoParams) {
  return Prototype({
    initType: ObjectInitType.CONTEXT,
    accessLevel: params?.accessLevel || AccessLevel.PRIVATE,
    ...params,
  });
}
