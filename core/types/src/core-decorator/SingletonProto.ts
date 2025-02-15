import type { AccessLevel } from './enum/AccessLevel.js';

export interface SingletonProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
