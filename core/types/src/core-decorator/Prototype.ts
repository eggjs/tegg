import { AccessLevel } from './enum/AccessLevel.js';
import { ObjectInitTypeLike } from './enum/ObjectInitType.js';

export interface PrototypeParams {
  name?: string;
  initType?: ObjectInitTypeLike;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}

export const DEFAULT_PROTO_IMPL_TYPE = 'DEFAULT';
