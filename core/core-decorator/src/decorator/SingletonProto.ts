import { Prototype } from './Prototype';
import { ObjectInitType } from '../enum/ObjectInitType';
import { AccessLevel } from '../enum/AccessLevel';

interface SingletonProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
}

export function SingletonProto(params?: SingletonProtoParams) {
  return Prototype({
    initType: ObjectInitType.SINGLETON,
    accessLevel: params?.accessLevel || AccessLevel.PRIVATE,
    ...params,
  });
}
