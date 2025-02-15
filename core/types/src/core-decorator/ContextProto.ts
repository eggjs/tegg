import { AccessLevel } from './enum/AccessLevel.js';

export interface ContextProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
