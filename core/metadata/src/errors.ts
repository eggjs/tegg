import { EggPrototypeName, QualifierInfo } from '@eggjs/core-decorator';

export class EggPrototypeNotFound extends Error {
  constructor(protoName: EggPrototypeName, loadUnitId: string | undefined) {
    const msg = loadUnitId
      ? `Object ${String(protoName)} not found in ${loadUnitId}`
      : `Object ${String(protoName)} not found`;
    super(msg);
  }
}

export class MultiEggPrototypeFind extends Error {
  constructor(name: EggPrototypeName, qualifier: QualifierInfo[]) {
    super(`multi proto find for name:${String(name)} qualifiers:${JSON.stringify(qualifier)}`);
  }
}
