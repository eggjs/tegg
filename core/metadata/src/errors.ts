import { FrameworkBaseError } from 'egg-errors';
import { EggPrototypeName, QualifierInfo } from '@eggjs/core-decorator';

export enum ErrorCodes {
  EGG_PROTO_NOT_FOUND = 'EGG_PROTO_NOT_FOUND',
  MULTI_PROTO_FOUND = 'MULTI_PROTO_FOUND',
}

export class TeggError extends FrameworkBaseError {
  get module() {
    return 'TEGG';
  }
}

export class EggPrototypeNotFound extends TeggError {
  constructor(protoName: EggPrototypeName, loadUnitId: string | undefined) {
    const msg = loadUnitId
      ? `Object ${String(protoName)} not found in ${loadUnitId}`
      : `Object ${String(protoName)} not found`;
    super(msg, ErrorCodes.EGG_PROTO_NOT_FOUND);
  }
}

export class MultiPrototypeFound extends TeggError {
  constructor(name: EggPrototypeName, qualifier: QualifierInfo[], result?: string) {
    const msg = `multi proto found for name:${String(name)} and qualifiers ${JSON.stringify(qualifier)}${result ? `, result is ${result}` : ''}`;
    super(msg, ErrorCodes.MULTI_PROTO_FOUND);
  }
}
