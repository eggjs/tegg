import { ProtoMeta } from './types';

export class ContextProtoProperty {
  static readonly Event: ProtoMeta = {
    protoName: 'event',
    contextKey: Symbol('context#event'),
  };
}
