import type { AccessLevel } from './enum/index.js';

export interface SingletonProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
