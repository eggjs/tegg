import { Prototype } from './Prototype';
import { ObjectInitType } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';

export interface ContextProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
}

export function ContextProto(params?: ContextProtoParams) {
  return Prototype({
    initType: ObjectInitType.CONTEXT,
    accessLevel: params?.accessLevel || AccessLevel.PRIVATE,
    ...params,
  });
}
