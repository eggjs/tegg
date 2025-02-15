import { AccessLevel } from './enum/index.js';

export interface ContextProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
