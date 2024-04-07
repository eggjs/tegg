import { AccessLevel } from './enum/AccessLevel';

export interface ContextProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
