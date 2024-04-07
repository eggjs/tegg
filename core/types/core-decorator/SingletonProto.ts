import type { AccessLevel } from './enum/AccessLevel';

export interface SingletonProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
