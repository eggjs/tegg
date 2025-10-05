import type { AccessLevel } from './enum/index.ts';

export interface ContextProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
