import type { AccessLevel, ObjectInitTypeLike } from './enum/index.js';

export interface PrototypeParams {
  name?: string;
  initType?: ObjectInitTypeLike;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}

export const DEFAULT_PROTO_IMPL_TYPE = 'DEFAULT';
