import { AccessLevel } from './enum/AccessLevel';
import { ObjectInitTypeLike } from './enum/ObjectInitType';

export interface PrototypeParams {
  name?: string;
  initType?: ObjectInitTypeLike;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}

export const DEFAULT_PROTO_IMPL_TYPE = 'DEFAULT';
